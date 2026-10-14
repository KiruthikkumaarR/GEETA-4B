# GEETA 4B — Resumption handoff (Session 7)

User requested PAUSE. All work below is verified. Nothing is mid-flight; no
background processes are running; disk has ~218 GB free.

## Overall %
~39% (M1 100, M2 90, M3 100, M4 ~25, M5 45, M6 15, M7 0, M8 0, M9 15, M10 5).
User goal stated this session: "make it 50% today, no hurry, work done clearly".

## Verified this session (do NOT re-recon)

1. **Pre-flight e2e PASSED** (script: scratchpad `preflight_m4_e2e.py`, re-runnable):
   - `mlx_vlm.load("models/Qwen3.5-4B-MLX-8bit")` → (model, Qwen3VLProcessor), lazy load 1.7 s.
   - config token ids: image 248056, video 248057, vision_start 248053, vision_end 248054,
     eos [248044, 248046], vocab 248320, model_type qwen3_5.
   - Template render: completed assistant turn = `\n` + text + `\n\n` (no think wrapper);
     generation prompt tail = `\n\n\n\n`.
   - `prepare_inputs`: sentinel expands to 174 image tokens = grid 1x12x58 / 4; pixel_values fp32.
   - Forward OK 0.4 s; model() returns **LanguageModelOutput** — take `.logits`.
   - `mlx_vlm.generate(model, processor, RENDERED_STRING, image=[pil], ...)` works.
   - CRITICAL: generate() passes prompt to qwen3_vl processor which does
     `text[i].replace("<|placeholder|>", self.image_token)` → **message dicts CRASH**;
     always render with `mlx_vlm.apply_chat_template(processor, model.config, msgs,
     add_generation_prompt=True, num_images=1)` FIRST.
   - Base-model OCR: real ava page → good transcription (96 tok in 5.1 s); synth hw_0000 →
     EXACT target " Round 99 to the nearest 100" (0.4 s).

2. **R1 GGUF path verified** (b10580 conversion package in third_party/llama.cpp/):
   - `conversion/qwen.py: Qwen3_5TextModel(_Qwen35MRopeMixin, _LinearAttentionVReorderBase)`
     registered for "Qwen3_5ForConditionalGeneration"+"Qwen3_5ForCausalLM", arch QWEN35
     (gguf-py: QWEN35 → "qwen35"). Delta-net covered: A_log→-exp, dt_bias→dt_proj.bias,
     conv1d squeeze, in_proj_qkv/z/a/b + out_proj V-head reordering, mrope default [11,11,10,0].
   - `conversion/qwen3vl.py: Qwen3VLVisionModel` registered for Qwen3_5ForConditionalGeneration;
     handles blocks (qkv/proj/fc/fc2/norms), merger, patch_embed Conv3D split (needs 5D), pos_embed.
   - Key map MLX(1221) → HF(738): `language_model.model.X` → `model.language_model.X` (1:1 names!);
     `vision_tower.X` → `model.visual.X`; skip `mtp.*` (16 HF keys, absent in MLX — fine);
     skip all-zero `*.biases` + `*.scales`.
   - SHAPE FIXES MLX→HF: conv1d [8192,4,1]→[8192,1,4] permute(0,2,1);
     patch_embed [1024,2,16,16,3]→[1024,3,2,16,16] permute(0,4,1,2,3).
   - `Model.sanitize` in mlx_lm/models/qwen3_5.py confirms the same remap direction.

3. **mlx_lm 0.31.3 API facts** (for the notebook):
   - `tree_flatten/tree_unflatten` are in **mlx.utils** (NOT mx, NOT mlx.nn in 0.32.1).
   - `linear_to_lora_layers(model, n, cfg_dict, use_dora)` — works on top-level Model
     because qwen3_5 Model has `@property layers`. Wraps nn.Linear/QuantizedLinear/Embedding.
   - `LoRALinear` is in **mlx_lm.tuner.utils** (not lora module; no lora subpackage).
     `.fuse(dequantize=True)` → nn.Linear(base + scale·BᵀAᵀ, dequantized).
   - `load_adapters(model, adapter_path)`, `remove_lora_layers(model)` in tuner.utils.
   - `save_model(dir, model)` writes ALL params via tree_flatten(model.parameters()) + index.
   - `dequantize_model(model)` recursive over QuantizedLinear/QuantizedEmbedding/SwitchLinear.
   - `mlx_lm.load(path, lazy=..., return_config=True, tokenizer_config=...)` works on the dir.
   - LM model object = 924 keys (language_model.*), NO mtp, NO vision (297 vision_tower keys
     in dir are NOT part of the model object — handle separately at merge).
   - LoRA: `lora_parameters` is a plain dict; `lr_schedule` = {name: "<mx.optim.schedulers attr>",
     arguments: [...], warmup: N, warmup_init: lr}.
   - ChatDataset.process: `tokens = tok.apply_chat_template(messages, tools=None, return_dict=False)`
     (agp defaults TRUE) → for assistant-terminated rows tokens include dangling GP + empty-think;
     with mask_prompt offset = len(render(messages[:-1], agp=True)) → ~2-token misalignment.
     ⇒ custom dataset class needed (exact fix in next-steps #2).
   - iterate_batches: sorts by len, truncates to max_seq_length (warns once), pads to 1+32k,
     yields (batch, mx.array(zip(offsets, lengths))); default_loss masks steps in [offset, length].
   - train(): grad_checkpoint monkeypatch, Adam/AdamW, CacheDataset, training_callback(name, value, step).
   - CONFIG_DEFAULTS: see session-6 handoff §3.5 (model/train/fine_tune_type/optimizer/optimizer_config/
     data/seed/num_layers/batch_size/iters/val_batches/learning_rate/steps_per_report/steps_per_eval/
     resume_adapter_file/adapter_path/save_every/test/test_batches/max_seq_length/config/
     grad_checkpoint/grad_accumulation_steps/clear_cache_threshold/lr_schedule/lora_parameters/
     mask_prompt/report_to/project_name).
   - Dataset routing (tuner.datasets.create_dataset): prompt+completion → CompletionsDataset;
     messages → ChatDataset. load_local_dataset(dir) reads train/valid/test.jsonl.

4. **mlx_vlm 0.6.15 API**: apply_chat_template top-level (qwen3_5 in MODEL_CONFIG →
   LIST_WITH_IMAGE_FIRST; images NOT stripped); vutils.load → (model, processor);
   prepare_inputs(processor, images=[pil], prompts=[str]); generate(...); trainer.utils has
   grad_checkpoint + get_learning_rate.

5. Model/data assets confirmed on disk (see session-6 handoff §7). HF config at
   models/Qwen3.5-4B/config.json (no quant fields, full tokenizer files, 2 shards).

## Scratchpad state (/Users/kiruthikkumaar/.lmstudio/scratchpads/e7)
- `preflight_m4_e2e.py` — WORKING e2e script (re-runnable; ~15 s wall).
- `preflight_m4.py` — earlier recon (superseded).
- `build04.py` — DRAFT notebook builder. Contains 3 known-bad placeholder lines to fix
  before running: (1) `NB.mkdir? = None` junk line near top; (2) `rep["checks"]["eos_token_ids"] = ... .venv_placeholder ... if False else None` junk in Cell A; (3) `train_set.sort? = None` junk in Cell C. Also the Cell C design was left deliberately incomplete (see next-steps).

## Next steps on resume (in order)

1. **Fix + run build04.py** to emit `notebooks/04_finetune.ipynb`. Cell plan:
   - C1 setup: paths, done()/mark()/log() helpers, SENT/END_THINK/ASSIST_OPEN via chr()
     (notebook sources are raw JSON — backslash-sensitive strings MUST be built with chr()
     or written as literal \n escapes in a raw string; verify by reading notebook JSON back
     and py_compiling each cell).
   - A asset verify (lazy load + key layout asserts per §3.2/3.3) → outputs/m4/model_assembly_report.json.
   - B OCR smoke base (5 pages, gate non-empty) → outputs/m4/ocr_smoke_base.json.
   - C overfit: prefix-expand 20 rows (3228/706 ratio pattern; 20 rows → ~91 rows);
     CUSTOM GeetaChatDataset: process(row) = tokens agp=(last role=="user"); offset = len(render(messages[:-1], agp=(last role=="user"))); rows end in assistant ⇒ offset = len(full) - len(final assistant turn) exactly.
     VERIFY alignment empirically before trusting: assert render(messages[:-1], agp=True) == full_render[:offset] token-by-token for a sample row (catches the 0.31.3 tail quirk: template adds `\n\n\n\n` GP after completed turns — the messages[:-1] render of a user-ended prefix ends with `\n`, so they SHOULD match; if not, fall back to offset = 0 with mask_prompt=False and accept full-row CE).
     Run via library plumbing: monkeypatch NOT needed — reproduce run() body (freeze,
     linear_to_lora_layers, save adapter_config.json, TrainingArgs, Adam, train) with our
     datasets injected; capture loss via training_callback. rank 16 scale 2.0, 16 layers,
     batch 1, 60 iters, max_seq 1024, grad_checkpoint True.
     Gate: final train loss < 0.9 × first. Save adapter to outputs/m4/overfit_lora.
   - D full text LoRA: expand ALL 706 rows (3228 rows → outputs/m4/text_lora_data/);
     batch 1, grad_accum 2, grad_checkpoint True, iters 1000, lr_schedule cosine
     [1e-5, 1e-6, 1000] warmup 50, save_every 250, adapter_path outputs/m4/text_lora;
     max_seq_length 2048. Gate: validation loss decreases overall; early losses sane.
   - E vision tower: custom loop. 60 rows → per-row: precompute full/prefix token ids
     (agp semantics as above, num_images=1), prepare_inputs pixel_values+grid, mask
     (loss = final assistant turn only, image patch positions may be included in prefix).
     Freeze all; unfreeze vision_tower (bf16 as-is). Adam 1e-5, get_learning_rate(500, step, 50, 1e-5, 1e-6)
     or plain cosine; 500 iters; grad_checkpoint the tower blocks. Save trained tower keys
     (mx.save_safetensors, keys `vision_tower.*`) → outputs/m4/vision_tower/adapters.safetensors.
     Gate: loss drops. (Tower = 24 blocks, 297 keys, all bf16 in dir.)
   - F merge: mlx_lm.load(MLX_DIR) → load_adapters(outputs/m4/text_lora) →
     for all LoRALinear: fused = m.fuse(dequantize=True) → update_modules(tree_unflatten) →
     dequantize_model(model) → weights_lm = dict(tree_flatten(model.parameters())) (924→~426 keys after dequant; all bf16; language_model.* prefix).
     Tower: load 8bit dir safetensors → vision_tower.* (297 bf16) → overlay trained keys from E.
     COMBINED dict = {**weights_lm, **tower} (1221-249 scales-249 zero-biases... = 426+297 = 723 keys).
     mx.save_safetensors(combined, models/geeta-4b-mlx/model.safetensors); write index.json;
     copy config.json (POP quantization/quantization_config; keep token ids + text/vision config)
     + tokenizer files (tokenizer.json, merges, vocab, chat_template.jinja,
     preprocessor_config.json, video_preprocessor_config.json, processor_config.json, tokenizer_config.json) from 8bit dir.
     VERIFY: mlx_vlm.load(models/geeta-4b-mlx) → 1 real-page OCR + 1 text chat (no image)
     + 1 tutor-style hint prompt. Also mlx_lm.load for text gen sanity.
   - G GGUF: build models/geeta-4b-hf/ from merged MLX dir: remap keys (language_model.model.X→
     model.language_model.X; vision_tower.X→model.visual.X), apply the two shape transposes,
     drop all-zero biases (check: in_proj_*/out_proj/mlp/attn biases are all-zero by construction),
     keep f16; write model.safetensors (single, ~9.4 GB) + model.safetensors.index.json +
     ORIGINAL HF config.json + tokenizer files from HF dir. Assert remapped keys ==
     HF index keys − mtp.* (16). Then:
     cd third_party/llama.cpp && ../../.venv/bin/python convert_hf_to_gguf.py \
       ../../models/geeta-4b-hf --outtype f16 --outfile ../../models/geeta-4b/geeta-4b-f16.gguf
     (conversion import resolves via cwd; NO --mmproj flag: vision embedded in main GGUF).
     Verify via gguf-py: arch qwen35, block count 32, clip tensor count 297.
     Then llama-quantize geeta-4b-f16.gguf geeta-4b-q4_k_m.gguf Q4_K_M.
   - H serve smoke: llama-server --model .../geeta-4b-q4_k_m.gguf --port 8081 -c 16384 -ngl 99
     (subprocess, poll /health + /v1/models, SIGTERM in finally). POST /v1/chat/completions:
     (1) tutor text prompt, (2) kid page as base64 data-URL. Measure TTFT + tok/s.
     On vision failure → fallback `python -m mlx_vlm --model models/geeta-4b-mlx --port 8082`
     (the vlm OpenAI server) — record which path worked in outputs/m4/serve_smoke.json.
   - I summary → outputs/m4/m4_summary.json + printed table.
   - ALL cells: resume guard `if done("X"): skip else: ... mark("X")`; `del model; mx.clear_cache()`
     between heavy cells; run from project root (assert PROJECT_BRIEF.md exists).

2. **Execute**: A–C foreground via sliced notebook (or jupyter execute on first cells);
   then full background: `nohup .venv/bin/jupyter execute --kernel python3 notebooks/04_finetune.ipynb > logs/m4_finetune.log 2>&1 &`
   WATCH logs/m4_finetune.log in first minutes of D (loss must drop; kill+fix if flat).

3. **While M4 trains (ETA 2–4 h)** build the other artifacts:
   - M6 `notebooks/06_ocr_loop.ipynb`: OCR loop on 2 real pages + held-out handwriting
     (data/eval/handwriting_synth + manifest; GT in train_vision/manifest), char accuracy vs
     baseline ocr_smoke_base.json.
   - M7 `webapp/`: index.html + static/app.js + static/style.css (canvas board pen→PNG,
     chat, voice via Web Speech API); `webapp/geeta_server.ipynb` FastAPI (uses tools/* geeta.*
     via tools/_nbmodule.ipynb bootstrap pattern); run_webapp.sh.
   - M8 `notebooks/08_reports.ipynb` + `tools/reports.ipynb`: parent PDF (reportlab+matplotlib
     charts from session JSON: skills touched, time, confidence, engagement), dev report
     (tokens/s, TTFT, verifier pass, hint depth, retries, leak triggers), email dry-run (SES) +
     WhatsApp Business API dry-run — NO real sends.
   - M9 `notebooks/09_eval_harness.ipynb` + `config/eval/rubric.md` +
     `config/eval/success_criteria.yaml` (CREATE — config.yaml pilot.pre_registration points here):
     per-axis scoring on held-out 249 + 36 probes + handwriting; overall /100; pre-registered criteria.
   - M10 `notebooks/10_pilot_prep.ipynb` + docs/{pilot_protocol.md, hrec_application.md,
     case_study_writeup.md}: n=2, non-causal, camera = optional Phase-2 add-on,
     pre-registered criteria, pre/post parallel forms.
   - Update config/sampling.yaml comment: thinking OFF via post-strip in engine, NOT template kwarg.

4. **After M4 lands**: run 05 (zero-wrong + ≥30 probes 0 leaks on real model), 06 (OCR ≥85%
   char acc measured), 09 (scorecard: in-scope ≥90% etc.). If any real run fails: report
   exactly + one resume command. NO fake passes.

5. **Final polish**: STATUS.md (measured numbers; pending-external: HREC filing, live pilot,
   full real corpus), root README.md, refresh requirements.txt (+torch), clear stale outputs in
   tools/*.ipynb, report final %. Do NOT delete models/Qwen3.5-4B/.cache/ or the llama.cpp tarball.

## Standing rules
- User: "completely finish it" · all project Python = .ipynb (vendored third_party exempt) ·
  periodic % reports · target 50% this day.
- Environment: zsh; ALWAYS quote "GEETA - 4B" paths; .venv/bin/python (3.14); no timeout cmd.
- JSON/shell gotchas: shell_command JSON-decodes (avoid typed backslash escapes; use chr());
  replace_file/edit_file_tool payloads pass RAW (backslashes survive — verify by read-back).
  Unicode chat-template tokens (
, 
, 
, 
) get TRUNCATED in some transport paths — always build via chr() and verify.

## Plan approval status
User-approved: finish completely, .ipynb rule, brief-locked §2, periodic %, 50% target.
My design (session 5/6/7, in force): custom dataset offset fix, 0.6.15 API usage, post-strip
thinking, notebook structure, M7–M10 designs, background-run strategy, MLX-serve fallback.

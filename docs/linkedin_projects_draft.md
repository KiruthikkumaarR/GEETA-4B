# LinkedIn: Projects section drafts

All numbers come from the project READMEs/STATUS.md, so they match what the projects actually report.

---

## 1. Enterprise Agentic RAG Engine

**Project name:** Enterprise Agentic RAG Engine (zero-hallucination document Q&A)
**Associated with:** Adelaide University, Master of AI & ML
**Dates:** Aug 2026 – Present (set by Kiruthik on LinkedIn)
**Project URL:** https://kiruthikportfolio.com (interactive demo)
**Skills:** Retrieval-Augmented Generation (RAG) · LoRA Fine-tuning · PyTorch · Qdrant · llama.cpp · FastAPI

**Description:**
A question-answering system for private company documents. It cites every claim to the exact page and runs 100% on-premise on one laptop, so no data or query ever leaves the machine.

• Hybrid retrieval: BGE-M3 dense + sparse search in Qdrant, fused with Reciprocal Rank Fusion
• Fine-tuned a bge-reranker-large cross-encoder on mined hard negatives (pairwise loss), which raised top-1 accuracy from 0.76 to 0.995
• Fine-tuned Phi-4-mini with LoRA to write cited answers, served with llama.cpp
• Independent faithfulness guardrail (citation, exact-number and DeBERTa NLI entailment checks) that retries or refuses instead of guessing
• Secure web portal with 30 role-based accounts, access control enforced inside vector search, live dashboards and one-click PowerPoint/Excel reports

Results on 200 held-out questions: 99.5% answers correct, 0% wrong answers delivered, 100% citation accuracy, RAGAS faithfulness 0.997, context precision 0.99, p95 latency 2.0 s (target < 3.5 s). It also refused all 20 unanswerable questions.

---

## 2. GEETA: AI maths tutor for children (Years 1–3)

**Project name:** GEETA 4B: AI maths tutor for children
**Associated with:** Adelaide University, Master of AI & ML (Master's project)
**Dates:** Aug 2026 – Oct 2026
**Project URL:** https://kiruthikportfolio.com/geeta/
**Skills:** Large Language Models (LLM) · Computer Vision · LoRA Fine-tuning · MLX · llama.cpp · FastAPI · AI Safety

**Description:**
An AI homework buddy for Australian children in Years 1–3 (ACARA-aligned) that guides kids to the answer without ever giving it away. It runs fully locally, and privacy was part of the design from the start.

• Fine-tuned Qwen3.5-4B (vision + text) with LoRA and vision-tower training to read children's handwriting and photographed worksheets (99.3% handwriting OCR accuracy)
• Exact Python tutoring engine decides every piece of maths and every right/wrong check. The model only reads the page, so children never receive wrong maths
• Guardrails tested with adversarial probes: 0 answers leaked, 0 wrong answers delivered
• Parent/tutor portal with role-based sign-in, 2-step authentication, kid picture-PIN login and learning-summary-only storage. 78/78 security attack tests blocked
• Pre-registered evaluation: 96.1/100 scorecard, 94% in-scope accuracy, and all 5 success criteria passed

---

## 3. kiruthikportfolio.com: personal portfolio

**Project name:** kiruthikportfolio.com: portfolio with interactive AI demo
**Dates:** Oct 2026
**Project URL:** https://kiruthikportfolio.com
**Skills:** JavaScript · Three.js · HTML/CSS · GitHub Pages · Web Development

**Description:**
A personal portfolio site, hand-built with plain HTML/CSS/JS and no build step, hosted on GitHub Pages with a custom domain.

• 3D hero and animated knowledge-galaxy views built with Three.js
• Interactive demo of the Enterprise Agentic RAG Engine. The real portal frontend runs against a replay layer of recorded system outputs, so it works instantly in any browser and never invents an answer
• Case study, results table and project pages for GEETA and earlier industry work

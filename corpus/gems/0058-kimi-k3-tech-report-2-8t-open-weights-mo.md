# Kimi K3 tech report — 2.8T open-weights MoE: agentic RL environments, million-token infra, XTML chat template

| | |
|---|---|
| Source | https://github.com/MoonshotAI/Kimi-K3/blob/main/k3_tech_report.pdf |
| Repo | https://github.com/MoonshotAI/Kimi-K3 @ `7c5be95` |
| Kind | paper |
| Topics | agent, eval, infra, research |
| License | none (forbidden) |
| Verdict | promote |
| Findings | 139 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/58 |

## Implementation decisions

<a id="g58-f001"></a>
### Scaled-sigmoid decay bounds KDA's chunkwise numerics

`k3_tech_report.pdf:4-5` @ 7c5be95

`k3_tech_report.pdf:4-5 ` — Scaled-sigmoid decay bounds KDA's chunkwise numerics. KDA's chunkwise form rescales keys by reciprocal decay `1/Γ` — overflow-prone since Kimi Linear's `g = -e^A·Softplus(z)` is unbounded below. K3 replaces it with `g = gmin·Sigmoid(e^A·z)`, `gmin = -5` fixed: `α > e^-5 ≈ 6.7×10⁻³`, log-decay over a 16-token tile in `(-80, 0)`, rescale under `e^80` (BF16). Diagonal/off-diagonal tiles run as dense Tensor Core matmuls, removing the prior bottleneck.

<a id="g58-f002"></a>
### Full-rank output gates replace low-rank gates on both attention types

`k3_tech_report.pdf:5-6` @ 7c5be95

`k3_tech_report.pdf:5-6 ` — Full-rank output gates replace low-rank gates on both attention types. KDA's gate moves from low-rank to full-rank, input-dependent `y_t = W_o[Sigmoid(W_g x_t) ⊙ RMSNorm(õ_t)]` (Eq. 6); MLA gets the same form `y_t = W_o[Sigmoid(W_g x_t) ⊙ õ_t]` (Eq. 7) — each token picks which channels it reads from global attention. MLA also drops positional encoding (NoPE), via KDA layers.

<a id="g58-f003"></a>
### FP32 attention output traded against KV pipeline depth

`k3_tech_report.pdf:6-6` @ 7c5be95

`k3_tech_report.pdf:6-6 ` — FP32 attention output traded against KV pipeline depth. To correct biased flash-attention rounding error, the attention output tile stays FP32 in training, doubling on-chip footprint; the kernel overlaps it with KV buffers instead of the query tile, freeing memory for a deeper pipeline.

<a id="g58-f004"></a>
### Block Attention Residuals cut cross-depth memory from O(Ld) to O(Nd)

`k3_tech_report.pdf:6-6` @ 7c5be95

`k3_tech_report.pdf:6-6 ` — Block Attention Residuals cut cross-depth memory from O(Ld) to O(Nd). Full AttnRes lets every layer attend (pseudo-query `w_l`, softmax over RMSNorm'd keys) to the embedding + all prior outputs, keeping `L` outputs alive. Block AttnRes sums layer outputs per `N` blocks into one representation, attending only across block summaries + intra-block partial sum. K3 uses `N ≈ 8` (per [58]): 8 blocks of 12 layers (9 total incl. embedding).

<a id="g58-f005"></a>
### Stable LatentMoE's two-failure-mode framing motivates a 3-part fix

`k3_tech_report.pdf:6-7` @ 7c5be95

`k3_tech_report.pdf:6-7 ` — Stable LatentMoE's two-failure-mode framing motivates a 3-part fix. At 896 routed experts / 16 active per token (sparsity 56), 2.8T total params, the path's ~4-matmul chain (`W-> -> gated expert FFN -> W->`) explodes internal activations; standard aux-loss-free balancing breaks down at ~10³ experts. Fix: RMSNorm before `W->` (Normalized LatentMoE), SiTU-GLU inside experts, Quantile Balancing for routing bias — each targeting a distinct failure mode.

<a id="g58-f006"></a>
### Quantile Balancing derives the bias from a Top-(k+1) cutoff, not an iterative sign update

`k3_tech_report.pdf:8-9` @ 7c5be95

`k3_tech_report.pdf:8-9 ` — Quantile Balancing derives the bias from a Top-(k+1) cutoff, not an iterative sign update. Routing computes Top-(k+1) on biased score; the (k+1)-th entry `α_i` is the cutoff a competing expert must beat. Expert `j`'s new bias is the `(1-k/n)`-quantile of margins `s_{:,j} - α` (Eq. 14) — hitting target `q = mk/n` in one pass, replacing `b^(t+1) = b^(t) + γ·sign(ℓ̄ - ℓ^(t))`, which needed `γ` tuned as a slow-adaptation/oscillation trade-off.

<a id="g58-f007"></a>
### MoonViT-V2 trains fully from scratch (next-token prediction), dropping SigLIP contrastive init

`k3_tech_report.pdf:9-9` @ 7c5be95

`k3_tech_report.pdf:9-9 ` — MoonViT-V2 trains fully from scratch (next-token prediction), dropping SigLIP contrastive init. Prior practice (even K2.5's MoonViT-3D) shows higher, spikier gradient norms with joint contrastive-encoder + LLM optimization; scratch training under the LM objective keeps gradients stable (Fig. 6), matching the SigLIP-initialized baseline on vision evals.

<a id="g58-f008"></a>
### Per-Head Muon orthogonalizes Q/K/V momentum blocks per-head, not as one matrix

`k3_tech_report.pdf:10-10` @ 7c5be95

`k3_tech_report.pdf:10-10 ` — Per-Head Muon orthogonalizes Q/K/V momentum blocks per-head, not as one matrix. Partitioning each projection's momentum matrix per-head before Newton–Schulz orthogonalization stops larger-scale heads from dominating the shared update (under-normalizing smaller heads), balancing learning + cheapening iterations on smaller blocks.

<a id="g58-f009"></a>
### Pixel-shuffle 2×2 downsampling keeps 3584×3584 images affordable in a 1M-token context

`k3_tech_report.pdf:10-10` @ 7c5be95

`k3_tech_report.pdf:10-10 ` — Pixel-shuffle 2×2 downsampling keeps 3584×3584 images affordable in a 1M-token context. Applied before the MLP projector, pixel-shuffle cuts visual tokens 4x; MoonViT-V2 is a 27-layer, ~0.4B-param ViT with RMSNorm, no bias in linear/attention projections.

<a id="g58-f010"></a>
### Knowledge/math rephrasing pipeline with fidelity verification

`k3_tech_report.pdf:10-10` @ 7c5be95

`k3_tech_report.pdf:10-10 ` — Knowledge/math rephrasing pipeline with fidelity verification. §3.1 Text data. Following K2's recipe, knowledge/math corpora are rephrased via style- and perspective-diverse prompting with chunk-wise autoregressive generation, then fidelity-verified against source documents — rewrites are gated by reconciliation against the original, not trusted outright.

<a id="g58-f011"></a>
### Data-mix ratios set by small-model ablations, not heuristics

`k3_tech_report.pdf:10-10` @ 7c5be95

`k3_tech_report.pdf:10-10 ` — Data-mix ratios set by small-model ablations, not heuristics. §3.1 Text data. Domain-specific sampling rates across Web Text, Code, Mathematics, and Knowledge are set by small-model ablations before the full run.

<a id="g58-f012"></a>
### Dual-format coordinate supervision for vision grounding

`k3_tech_report.pdf:10-10` @ 7c5be95

`k3_tech_report.pdf:10-10 ` — Dual-format coordinate supervision for vision grounding. §3.1 Vision data. Bounding-box/coordinate labels are supplied in absolute-pixel and normalized [0,1] formats simultaneously, for precise, resolution-robust localization.

<a id="g58-f013"></a>
### Scaling-law retune spans four axes, claims 2.5x efficiency gain over K2

`k3_tech_report.pdf:10-11` @ 7c5be95

`k3_tech_report.pdf:10-11 ` — Scaling-law retune spans four axes, claims 2.5x efficiency gain over K2. §3.2 Scaling Law, Fig. 7, Table 1. K3 reruns scaling-law studies (vs. K2's regime) to retune batch size, LR, TPP, and model shape, fit on held-out OOD loss vs. FLOPs. Fitted curves (Fig. 7) show K3 matching K2's validation loss at ~1/2.5 its FLOPs. Table 1 delta: layers 61->93, params 1.04T->2.78T, act. params 32.6B->104.2B, MoE dim/expert 2,048->3,072, routed experts 384->896, active/token 8->16, shared experts 1->2, heads 64->96, context 128K->1M, MLA->hybrid KDA–MLA (69 KDA+24 MLA vs. 61 MLA), SwiGLU->SiTU-GLU.

<a id="g58-f014"></a>
### Independent scaling-law search per LR schedule avoids biased comparison

`k3_tech_report.pdf:10-11` @ 7c5be95

`k3_tech_report.pdf:10-11 ` — Independent scaling-law search per LR schedule avoids biased comparison. §3.2 Scaling Law. Comparing cosine decay vs. Warmup-Stable-Decay (WSD), the team found markedly different optimal peak LR/batch size even at fixed model size/token budget — a shared hyperparameter set would favor whichever schedule it suits. They ran a separate scaling-law search per schedule; under each schedule's own optimum, cosine decay still won.

<a id="g58-f015"></a>
### Training recipe: Per-Head Muon + K2 weight-clipping + QB load balancing, cosine schedule with 1% warmup, WD 0.1

`k3_tech_report.pdf:11-11` @ 7c5be95

`k3_tech_report.pdf:11-11 ` — Training recipe: Per-Head Muon + K2 weight-clipping + QB load balancing, cosine schedule with 1% warmup, WD 0.1. §3.3 Training Recipe. Optimizer/schedule stack for the full pre-training run, plus native multimodal setup: visual/textual tokens interleaved in a single next-token objective from the start (no post-hoc vision-alignment bolt-on).

<a id="g58-f016"></a>
### Context length ramps 8K->64K during pre-training itself, before the long-context stage

`k3_tech_report.pdf:11-12` @ 7c5be95

`k3_tech_report.pdf:11-12 ` — Context length ramps 8K->64K during pre-training itself, before the long-context stage. §3.3/§3.4. Pre-training starts at 8k-token context, extended to 64k in a later phase — separate from and prior to the 256K->1M cooldown-phase extension below.

<a id="g58-f017"></a>
### NoPE + KDA recurrent gating reaches 1M tokens with zero positional-encoding surgery

`k3_tech_report.pdf:12-12` @ 7c5be95

`k3_tech_report.pdf:12-12 ` — NoPE + KDA recurrent gating reaches 1M tokens with zero positional-encoding surgery. §3.4 Positional encoding. K3 uses no explicit positional embedding; position encodes implicitly via KDA's recurrent gating/decay. Payoff: the model extrapolates directly to 1M-token contexts without RoPE rescaling or interpolation.

<a id="g58-f018"></a>
### Long-context cleaning combines exact+fuzzy dedup, perceptual video-frame hashing, and upsampling

`k3_tech_report.pdf:12-12` @ 7c5be95

`k3_tech_report.pdf:12-12 ` — Long-context cleaning combines exact+fuzzy dedup, perceptual video-frame hashing, and upsampling. §3.4 Long-context data. Natural long documents/videos are heavily contaminated (near-duplicates, binary blobs, truncated files, invalid machine-generated logs), run through exact+fuzzy dedup, perceptual hashing over video frames, heuristic/classifier quality filtering, and structural validation — then upsampled during cooldown.

<a id="g58-f019"></a>
### Synthetic long-range tasks built by permuting/concatenating documents to force full-context use

`k3_tech_report.pdf:12-12` @ 7c5be95

`k3_tech_report.pdf:12-12 ` — Synthetic long-range tasks built by permuting/concatenating documents to force full-context use. §3.4 Long-context data. Because "length alone does not confer long-range capability," K3 synthesizes long-context examples by permuting/concatenating multimodal documents and sub-tasks, solvable only by attending across the full 1M-token window.

<a id="g58-f020"></a>
### Four-stage context curriculum confines expensive long-sequence work to cooldown

`k3_tech_report.pdf:12-12` @ 7c5be95

`k3_tech_report.pdf:12-12 ` — Four-stage context curriculum confines expensive long-sequence work to cooldown. §3.4 Progressive context extension. Window grows 8K->64K during pre-training, then 256K->1M during cooldown — a four-stage curriculum.

<a id="g58-f021"></a>
### Three-stage post-training, nine expert models

`k3_tech_report.pdf:12-12` @ 7c5be95

`k3_tech_report.pdf:12-12 ` — Three-stage post-training, nine expert models. Post-training: SFT (cold-start) -> RL (domain experts) -> Multi-Teacher On-Policy Distillation (consolidation). RL trains one expert per (domain × reasoning-effort) pair, not per-task, across three domains — *general tasks*, *general agents*, *coding agents* — crossed with three effort levels `{low, high, max}`, yielding 9 expert models before MOPD unifies them.

<a id="g58-f022"></a>
### RL FLOPs scaling directly grows tool-call step count

`k3_tech_report.pdf:13-13` @ 7c5be95

`k3_tech_report.pdf:13-13 ` — RL FLOPs scaling directly grows tool-call step count. Figure 8 plots score and average assistant steps vs. RL FLOPs across 8 evals (Coding Experience, General Tool Use, Web Development, Agentic Search, Professional Workflows, Office Deliverables, Agentic Chart Understanding, Agentic Visual Puzzles); scaling RL FLOPs "consistently" increases tool-call steps with score — the model learns to *use more turns* as an emergent capability, not by instruction.

<a id="g58-f023"></a>
### Partial rollout with per-token off-policy regularization for long-horizon staleness

`k3_tech_report.pdf:13-13` @ 7c5be95

`k3_tech_report.pdf:13-13 ` — Partial rollout with per-token off-policy regularization for long-horizon staleness. For N prompts × K samples each, generation pauses once a fraction λ∈(0,1) of the NK trajectories finish; unfinished rollouts enqueue/resume at the next iteration's start, not blocking on stragglers. Since a trajectory can then span multiple training iterations, the policy-optimization algorithm uses "a per-token regularization" constraining updates to a local neighborhood.

<a id="g58-f024"></a>
### Reasoning-effort control via reward override, not a separate model

`k3_tech_report.pdf:13-13` @ 7c5be95

`k3_tech_report.pdf:13-13 ` — Reasoning-effort control via reward override, not a separate model. Each problem x gets an initial token budget b0(x) from the cold-start model; any trajectory whose total budget T(y) exceeds τ·b0(x) has its task reward overridden to −1. T(y) = thinking tokens for general tasks, cumulative output tokens (reasoning + tool-call args) for agentic tasks. Training is staged: first a *max-budget* expert (large τ, capped), then τ anneals to produce *high*- and *low*-effort experts — 3 tiers from one curriculum, not 3 runs.

<a id="g58-f025"></a>
### Agentic Generative Reward Model: mandatory rubric protocol + length-based anti-hacking

`k3_tech_report.pdf:13-13` @ 7c5be95

`k3_tech_report.pdf:13-13 ` — Agentic Generative Reward Model: mandatory rubric protocol + length-based anti-hacking. For non-verifiable tasks, a GRM does binary comparisons under a fixed protocol: (1) read outcome/product/text, (2) generate rubric, (3) score each candidate, (4) record in scorepad. To stop reward hacking toward verbosity, a candidate whose output length exceeds σ·ℓ0 (ℓ0 = initial verbosity from the cold-start model) automatically loses — the same trick as reasoning-effort control.

<a id="g58-f026"></a>
### MOPD reward is a clipped, stop-gradient teacher/student log-ratio, not a KL term

`k3_tech_report.pdf:13-14` @ 7c5be95

`k3_tech_report.pdf:13-14 ` — MOPD reward is a clipped, stop-gradient teacher/student log-ratio, not a KL term. Equation 15: `r_opd(y_t|e,x,y<t) = clip(sg(log(π_teacher/π_θ)), -Rmax, Rmax)`, teacher = whichever of the 9 domain×effort experts matches (d,e). Yields a *dense* per-token reward that "seamlessly integrates" into the existing RL infra.

<a id="g58-f027"></a>
### QAT runs through all of post-training, not just after, to kill train/inference mismatch

`k3_tech_report.pdf:14-14` @ 7c5be95

`k3_tech_report.pdf:14-14 `, `README.md:601-603 ` — QAT runs through all of post-training, not just after, to kill train/inference mismatch. MoE expert weights (dominant memory cost) quantize to MXFP4 with MXFP8 activations; non-expert components (attention/latent-MoE projections, shared experts, routers) stay high precision. QAT covers both SFT and RL, and "rollout and training share the same quantization scheme" — consequence: released weights are natively MXFP4/MXFP8, not post-hoc PTQ, constraining runtime/dtype choice.

<a id="g58-f028"></a>
### Draft model fine-tunes from the pretrained MTP layer with a likelihood-based acceptance-rate loss

`k3_tech_report.pdf:14-14` @ 7c5be95

`k3_tech_report.pdf:14-14 ` — Draft model fine-tunes from the pretrained MTP layer with a likelihood-based acceptance-rate loss. The EAGLE-3-style draft unrolls 7 training steps (consuming earlier outputs after step 1), fusing low/mid/high-level target features (1st, 4th, final AttnRes blocks) via a bias-free projection initialized as `[0 0 I]`. Loss (Eq. 16) optimizes `-log Σ min(p(x),q(x))` — negative log of the lossless-speculative-sampling acceptance rate — not a KL surrogate, since minimizing KL "does not guarantee maximizing this rate for a capacity-limited draft model."

<a id="g58-f029"></a>
### FlashKDA: a CUTLASS chunkwise kernel overlapping intra-chunk math with cross-chunk propagation

`k3_tech_report.pdf:17-18` @ 7c5be95

`k3_tech_report.pdf:17-18 ` — FlashKDA: a CUTLASS chunkwise kernel overlapping intra-chunk math with cross-chunk propagation. Naive chunkwise KDA alternates intra-chunk/cross-chunk phases, idling SMs. FlashKDA splits the work into token-parallel stages and a head-parallel recurrence, independently scheduled/tuned, and "substantially outperforms the Triton reference implementation." Serves training/inference prefill as a flash-linear-attention backend. §5.1.1 KDA Kernels across Regimes.

<a id="g58-f030"></a>
### Intra-device SM-level context-parallel planner for long-context prefill

`k3_tech_report.pdf:17-18` @ 7c5be95

`k3_tech_report.pdf:17-18 ` — Intra-device SM-level context-parallel planner for long-context prefill. Tensor parallelism partitions only heads; most SMs idle under pure TP during the serial recurrence. An automatic SM-level CP planner partitions the sequence across a *single rank*'s SMs, evaluating each segment's state transition independently, merging to recover its exact initial state — intra-device, zero cross-device comm (vs. KCP below). §5.1.1.

<a id="g58-f031"></a>
### KDA Context Parallelism (KCP): delta-rule-aware associative decomposition, not additive summation

`k3_tech_report.pdf:18-18` @ 7c5be95

`k3_tech_report.pdf:18-18 ` — KDA Context Parallelism (KCP): delta-rule-aware associative decomposition, not additive summation. Vanilla linear attention's context-parallel trick (summing local states from S=0) breaks for KDA: the delta rule applies a token-dependent transition matrix M_t before writing, so a segment's effect isn't recoverable from the S=0 local state alone (Eq. 1). KCP decomposes each rank's contribution into a cumulative transition matrix M^{t<-1} and a locally-computed state S̃ (Eq. 17); a prefix scan then recovers every rank's incoming state from one fixed-size `all-gather` — linear scaling in P ranks.

<a id="g58-f032"></a>
### MoonEP: perfect per-rank load balance via a bounded redundant-expert budget

`k3_tech_report.pdf:19-19` @ 7c5be95

`k3_tech_report.pdf:19-19 ` — MoonEP: perfect per-rank load balance via a bounded redundant-expert budget. Every EP rank is guaranteed exactly S×K tokens (S=seq length, K=experts/token), via dynamically migrating redundant experts. A balanced plan provably exists, reserving at most E/R redundant-expert slots per rank (E=total experts, R=EP size) — unlike ECHO/UltraEP, which preset a count/cap that can fail, stalling training.

<a id="g58-f033"></a>
### Offline ILP as ground truth, online near-optimal GPU kernel for the schedule

`k3_tech_report.pdf:19-19` @ 7c5be95

`k3_tech_report.pdf:19-19 ` — Offline ILP as ground truth, online near-optimal GPU kernel for the schedule. Computing the exact optimal plan every step is "prohibitively expensive," so MoonEP solves exact ILPs offline for representative cases, then runs a lightweight GPU planning kernel online: near-optimal, negligible overhead, respecting the E/R bound.

<a id="g58-f034"></a>
### Zero-copy dispatch/combine sized by the balance guarantee

`k3_tech_report.pdf:19-19` @ 7c5be95

`k3_tech_report.pdf:19-19 ` — Zero-copy dispatch/combine sized by the balance guarantee. Since token counts are perfectly balanced, a fused permute/unpermute kernel precomputes each token's destination, writing it directly into its expert-grouped position on the remote rank — no intermediate copy. The fixed-size communication buffer is only S×K; DeepEP, supporting worst-case imbalance with the same copy-free path, needs a buffer of S×K×R.

<a id="g58-f035"></a>
### Sync-free execution from static shapes

`k3_tech_report.pdf:19-20` @ 7c5be95

`k3_tech_report.pdf:19-20 ` — Sync-free execution from static shapes. Conventional MoE syncs host-device every layer to learn per-expert token counts before launching kernels, stalling it. Since MoonEP guarantees every rank always gets exactly S×K tokens, layer shapes are known statically, eliminating per-layer host sync and kernel-launch overhead.

<a id="g58-f036"></a>
### Workload-aware GEMM scheduling for the residual intra-rank skew

`k3_tech_report.pdf:20-20` @ 7c5be95

`k3_tech_report.pdf:20-20 ` — Workload-aware GEMM scheduling for the residual intra-rank skew. Even with aggregate cross-rank balance, per-expert counts *within* a rank stay skewed, turning a fixed-order schedule into an imbalanced SM makespan. A workload-aware scheduler adapts GEMM launch parameters to the current token distribution via an analytical, offline-autotuned cost model; shared-expert GEMMs dispatch to a separate stream.

<a id="g58-f037"></a>
### Unified activation manager: per-tensor storage policy, decoupled from model code

`k3_tech_report.pdf:20-20` @ 7c5be95

`k3_tech_report.pdf:20-20 ` — Unified activation manager: per-tensor storage policy, decoupled from model code. Every backward-pass tensor binds to a pluggable storage backend (recompute, quantize, offload, remote-offload) via lightweight annotations. Recompute is function-granularity; all GPU memory lives in one pool on the main stream, avoiding multi-stream fragmentation. Most K3 activations use block-wise FP8 quantization plus offload/remote-offload; element-wise ops use recompute.

<a id="g58-f038"></a>
### Memory-efficient MoE backward, SonicMoE-style

`k3_tech_report.pdf:20-20` @ 7c5be95

`k3_tech_report.pdf:20-20 ` — Memory-efficient MoE backward, SonicMoE-style. The permuted-probs gradient is rewritten (inspired by SonicMoE) to depend only on intermediate `act_output` and upstream gradient, not the forward `output`, at the cost of one extra lightweight elementwise op. Only the dispatch op's *input* is saved in the forward group GEMM; the backward pass recomputes it, overlapping its comm with the backward group-GEMM's own communication, "at a negligible cost."

<a id="g58-f039"></a>
### AttnRes memory design hits the theoretical lower bound

`k3_tech_report.pdf:20-20` @ 7c5be95

`k3_tech_report.pdf:20-20 ` — AttnRes memory design hits the theoretical lower bound. The shared attention-residual block representation is generated once at a boundary layer, reused by later layers; its recomputation is wrapped in checkpointing, so backward memory equals the standard architecture. Cross-PP-stage transfer uses cache-based pipeline communication: only newly generated blocks are incrementally transferred and released once the micro-batch finishes, "reaching the theoretical lower bound on memory footprint."

<a id="g58-f040"></a>
### PP activation imbalance fixed by cross-rank remote offload, not CPU offload

`k3_tech_report.pdf:20-20` @ 7c5be95

`k3_tech_report.pdf:20-20 ` — PP activation imbalance fixed by cross-rank remote offload, not CPU offload. Interleaved 1F1B pipelining leaves later PP ranks holding more resident activations (warmup skew). K3 remotely offloads activations to the memory of *other* PP ranks (via the Mooncake Transfer Engine) to balance memory across the pipeline and avoid OOM.

<a id="g58-f041"></a>
### P2P Muon orthogonalization avoids the full-parameter all-gather

`k3_tech_report.pdf:20-20` @ 7c5be95

`k3_tech_report.pdf:20-20 ` — P2P Muon orthogonalization avoids the full-parameter all-gather. Muon's Newton–Schulz step conventionally all-gathers the full sharded parameter buffer every update — the primary comm bottleneck. Instead each rank retrieves only the shards it locally owns via direct P2P from the owning ranks, eliminating the full-parameter buffer; comm and compute pipeline at model-chunk-buffer granularity to hide latency.

<a id="g58-f042"></a>
### External KV cache pool: write-back, not write-through, semantics

`k3_tech_report.pdf:21-21` @ 7c5be95

`k3_tech_report.pdf:21-21 ` — External KV cache pool: write-back, not write-through, semantics. Active decode blocks stay resident in GPU KV cache; reusable idle prefixes write back to CPU-DRAM only *at eviction time*, prefetching before reuse. Versus write-through, this costs DRAM/bandwidth only for prefixes that leave the active decode path, not blocks that stay resident.

<a id="g58-f043"></a>
### Gradient-buffer reuse makes reference-model weights a free-rider on existing allocations

`k3_tech_report.pdf:21-22` @ 7c5be95

`k3_tech_report.pdf:21-22 ` — Gradient-buffer reuse makes reference-model weights a free-rider on existing allocations. RL reference-model weights, too large to keep resident, are kept in CPU memory and materialized by backing them with the *policy model's* FP32 gradient-buffer storage. Under ZeRO-2 each GPU retains buffers for only two VPP chunks, so weights stream in chunk-by-chunk, prefetch hiding copy overhead — zero extra GPU memory.

<a id="g58-f044"></a>
### AgentENV: microVM (Firecracker) sandbox with incremental checkpoint/resume and fork

`k3_tech_report.pdf:22-22` @ 7c5be95

`k3_tech_report.pdf:22-22 ` — AgentENV: microVM (Firecracker) sandbox with incremental checkpoint/resume and fork. Checkpoint/resume saves only dirtied pages since last checkpoint: as low as 133ms / 49ms. Pause consumes zero memory/CPU, up to 98% of sandbox lifetime; Fork branches a new sandbox from a running one's exact state (reward judging, no side effects), no pause; OverlayBD + custom ublk driver + P2P transport give sub-second launch at scale; copy-on-write + page-cache tricks reach up to 6.5× memory overcommit. Total: 51,219,741 sandboxes over 1,505,678 images.

<a id="g58-f045"></a>
### Prefix cache unifies two structurally different caches into one paged pool

`k3_tech_report.pdf:22-23` @ 7c5be95

`k3_tech_report.pdf:22-23 ` — Prefix cache unifies two structurally different caches into one paged pool. KDA's fixed-size recurrent state and MLA's per-token-growing KV cache pack into the *same* paged pool via unified page byte size, sharing one allocation/refcounting/eviction implementation. Each page stores all heads' state contiguously head-by-head, making each head's byte stream self-contained: the minimal cross-node transfer unit.

<a id="g58-f046"></a>
### Decoupled hash/checkpoint granularity solves KDA's coarse-caching problem

`k3_tech_report.pdf:23-24` @ 7c5be95

`k3_tech_report.pdf:23-24 ` — Decoupled hash/checkpoint granularity solves KDA's coarse-caching problem. Naive block-hash caching ties to KDA's recurrent-state checkpoint granularity, forced to 1024–6144 tokens, where "caching is nearly useless." Fix: hash fine 512-token blocks inside coarse 6144-token pages, but checkpoint KDA state only at a sparse subset of hash endpoints (typically conversation-turn boundaries). Lookup matches whole physical blocks by chained hash for MLA, needing a KDA checkpoint at the candidate boundary; e.g. a 2800-token request hits at B=2560, resuming prefill there instead of recomputing the first 2560 tokens.

<a id="g58-f047"></a>
### Three targeted invariants keep the shared prefix cache consistent under concurrency

`k3_tech_report.pdf:24-24` @ 7c5be95

`k3_tech_report.pdf:24-24 ` — Three targeted invariants keep the shared prefix cache consistent under concurrency. (1) A hit block pins across *all* cache groups — a private-copy allocation in one group can never evict a block another just hit. (2) The private-block copy runs on GPU immediately before the forward pass — a block registered mid-step is excluded until its copy lands. (3) A checkpoint restores a request only if it exists in *every* KDA group, and evicting one group's checkpoint invalidates its siblings — hittable everywhere or nowhere.

<a id="g58-f048"></a>
### Speculative decoding forces caching KDA's *inputs*, not its state

`k3_tech_report.pdf:24-24` @ 7c5be95

`k3_tech_report.pdf:24-24 ` — Speculative decoding forces caching KDA's *inputs*, not its state. In-place recurrent-state updates break MPT-style speculative decoding: rejected drafts leave the state already past the last accepted token, unable to cheaply roll back; snapshotting every draft position would multiply state traffic. The fix caches only the smaller projected inputs of draft tokens, rebuilds accepted-token states on-chip, and writes back verified+bonus-token states in one kernel.

<a id="g58-f049"></a>
### Block AttnRes: sequence-parallel prefill, fused decode

`k3_tech_report.pdf:24-25` @ 7c5be95

`k3_tech_report.pdf:24-25 ` — Block AttnRes: sequence-parallel prefill, fused decode. For prefill, the TP all-reduce of block representations decomposes into reduce-scatter + all-gather (intra-block kernel between, on sequence-sharded hidden states) — each token's block representation lands on exactly one rank (no redundant memory/I-O). For decode, the inter-block kernel runs on a side stream to overlap the main stream; the intra-block phase (AttnRes merge + partial-sum + RMSNorm) fuses into the preceding TP all-reduce, removing a dedicated kernel.

<a id="g58-f050"></a>
### Stable LatentMoE decode kernel built on token-centric WarpDecode

`k3_tech_report.pdf:24-25` @ 7c5be95

`k3_tech_report.pdf:24-25 ` — Stable LatentMoE decode kernel built on token-centric WarpDecode. Latent down-projection fuses with the MoE router into a single GEMM; weight matrices shard across ranks, output all-gather fused into the GEMM epilogue, overlapping comm. Routed experts at small batch size are memory-bound, ill-suited to tile-centric kernels; WarpDecode assigns one warp per output neuron, streaming weights directly from memory, then splits into lane teams (warp-wide reduction), plus an offline-permuted layout cutting dequant overhead.

<a id="g58-f051"></a>
### Cache-aware affinity scheduling with distributed failover

`k3_tech_report.pdf:25-25` @ 7c5be95

`k3_tech_report.pdf:25-25 ` — Cache-aware affinity scheduling with distributed failover. A typical 1M-context session carries a ~400K-token prefix but grows only ~4K tokens/turn — a cache hit is orders of magnitude cheaper than a miss. Sessions pin via consistent hashing to a primary cluster (holding the prefix cache) and a pre-assigned secondary taking over on primary failure; hashing spreads secondary assignments uniformly, so one cluster's failure divides re-prefill load across many clusters, not one.

<a id="g58-f052"></a>
### Budget-based admission control for a 1000× request-cost spread

`k3_tech_report.pdf:25-25` @ 7c5be95

`k3_tech_report.pdf:25-25 ` — Budget-based admission control for a 1000× request-cost spread. Production traffic mixes sub-2K-token requests with up to 1M-token requests — roughly three orders of magnitude apart in per-request cost — breaking capacity planning based on "average request" cost. Separate resource budgets per request class cap a burst of long-context traffic to its own share, protecting system-wide TTFT for other classes.

<a id="g58-f053"></a>
### MoonEP's E/R bound is proven by an explicit greedy migration algorithm, not LP relaxation

`k3_tech_report.pdf:45-45` @ 7c5be95

`k3_tech_report.pdf:45-45 ` — MoonEP's E/R bound is proven by an explicit greedy migration algorithm, not LP relaxation. Theorem 1's constructive proof: repeatedly migrate tokens between one underloaded/overloaded rank pair until the underloaded rank hits exactly S×K, then drop it; each fill permanently balances one rank, terminating in at most R−1 fills; since each rank fills at most once, its remote tokens trace to a single other rank — bounding it to at most E/R local experts. Holds for *any* router output I: M(I) ≤ E/R (Eq. 28). Theorem 2: essentially tight, achieved by M = ⌈E(R−1)/R²⌉ ≈ E/R.

<a id="g58-f054"></a>
### Task-type-conditioned sampling config

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 ` — Task-type-conditioned sampling config. All K3 evals use reasoning effort `max` and temperature 1.0, but top-p splits by task: 0.95 single-step (GPQA Diamond, HLE-Full, vision benchmarks w/o tools), 1.0 agentic. This generalizes to a standing recommendation: top-p=0.95 for reasoning/knowledge, top-p=1.0 for coding/agentic scenarios (§Evaluation Configurations), restated in `README.md:572-572 `.

<a id="g58-f055"></a>
### Harness-parity discipline for coding evals

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 ` — Harness-parity discipline for coding evals. Each model runs under one of three harnesses (Kimi Code, Claude Code, Codex). For Terminal-Bench 2.1, the paper reports "the best score across harnesses for all models" (not just its own), cross-checking its DeepSWE number against the benchmark's official leaderboard using a *different* harness (mini-SWE-agent gives 67.3) — a sanity check (§Coding, Evaluation Configurations).

<a id="g58-f056"></a>
### Two-tier cyber eval calibrated in human-hours, with a baseline gap

`k3_tech_report.pdf:30-31` @ 7c5be95

`k3_tech_report.pdf:30-31 ` — Two-tier cyber eval calibrated in human-hours, with a baseline gap. §6.2.2 splits cybersecurity capability into Tier 1 (vulnerability discovery + PoC, defensive) and Tier 2 (end-to-end exploit dev: 16 user-space + 20 Linux-kernel CVE tasks, reproducible QEMU environments). Every task is pre-verified solvable by human experts; suite difficulty is quantified as "roughly 540 expert-hours, or about 15 hours per task" — a concrete human baseline, not a bare pass rate.

<a id="g58-f057"></a>
### Cost-efficiency analysis with heterogeneous, disclosed cost sourcing

`k3_tech_report.pdf:31-32` @ 7c5be95

`k3_tech_report.pdf:31-32 ` — Cost-efficiency analysis with heterogeneous, disclosed cost sourcing. Kimi Code Bench 2.0 costs are metered internally; BrowseComp cost for K3 is its own runs, competitors' read off vendor charts; GDPval-AA v2/AA-Briefcase costs come from Artificial Analysis's pay-per-token pricing snapshot (July 23, 2026). Results plot score-vs-cost across effort levels (low/medium/high/max) per model (Figure 13) — K3 hits BrowseComp's best score (91.2%) at $2.03/task, half GPT-5.6 Sol's cost, an order of magnitude cheaper than Claude at max effort.

<a id="g58-f058"></a>
### Blind pairwise expert judging for a benchmark with no ground truth

`k3_tech_report.pdf:29-29` @ 7c5be95

`k3_tech_report.pdf:29-29 ` — Blind pairwise expert judging for a benchmark with no ground truth. Table 4 (Kimi Webdev Bench) has experts score K3 vs. Claude Opus 4.8 (both under the same Claude Code harness) on code quality, feature completeness, visual fidelity, and interaction experience "without knowing which model produced it," reporting Win/Tie/Lose per domain plus a Win−Lose margin (overall +31.0%, peaking at +59.1% on 3D/WebGL/Shader tasks).

<a id="g58-f059"></a>
### Sandboxed, cross-vendor, trajectory-tracked kernel-optimization case study

`k3_tech_report.pdf:33-33` @ 7c5be95

`k3_tech_report.pdf:33-33 ` — Sandboxed, cross-vendor, trajectory-tracked kernel-optimization case study. Each model works independently in an identically configured sandbox with a 24-hour budget per task, across four kernels (AttnRes, DSA, KDA, MLA) on an NVIDIA Hopper GPU and an "alternative-vendor GPGPU." Figure 14 plots speedup-vs-active-hours as a step function per model (K3 +59.7%, Claude Fable 5 +57.1%, GPT-5.5 +30.8%, GPT-5.6 Sol +17.3% on AttnRes), capturing the optimization trajectory, not just the endpoint.

<a id="g58-f060"></a>
### Numerical correctness validation for a from-scratch compiler

`k3_tech_report.pdf:33-34` @ 7c5be95

`k3_tech_report.pdf:33-34 ` — Numerical correctness validation for a from-scratch compiler. MiniTriton's reverse-mode autograd is checked against a torch-autograd reference with an explicit tolerance bar — "differing from torch autograd by no more than torch's own fp32 rounding error (10⁻⁴), measured against an fp64 reference" — and its roofline plots (Figure 15) include losing points, not just wins. A separate 2-GPU DDP-vs-single-GPU convergence check reports max/mean cross-entropy diff (0.0033 / 0.0003) as the equivalence bar.

<a id="g58-f061"></a>
### Deployment surface

`README.md:605-613` @ 7c5be95

`README.md:605-613 ` — Deployment surface. Hosted API at `https://platform.kimi.ai` (model id `kimi-k3`), "OpenAI/Anthropic-compatible API." Recommended self-hosting engines: vLLM (recipes.vllm.ai), SGLang (external cookbook), and TokenSpeed (external recipes).

<a id="g58-f062"></a>
### Context length is 1048576 tokens (1M) per the Model Summary table.

`README.md:100-101` @ 7c5be95

`README.md:100-101 ` — Context length is `1048576` tokens (1M) per the Model Summary table.

<a id="g58-f063"></a>
### Code and weights ship under one custom licence, not an OSI one

`README.md:662-664` @ 7c5be95

`README.md:662-664 ` — Code and weights ship under one custom licence, not an OSI one. "Both the code repository and the model weights are released under the Kimi K3 License" (linked to the `LICENSE` file in repo) — GitHub reports it as `NOASSERTION`, so tooling that keys off SPDX ids will treat it as unlicensed.

<a id="g58-f064"></a>
### Recommended agent harness is Kimi Code CLI ("Kimi K3 works best with Kimi Code CLI as its…

`README.md:655-657` @ 7c5be95

`README.md:655-657 ` — Recommended agent harness is Kimi Code CLI ("Kimi K3 works best with Kimi Code CLI as its agent framework"), selected via `/model`.

## Skills, prompts, tools

<a id="g58-f065"></a>
### Unified white-box RL environment: the agent harness is a composable config, not a fixed scaffold

`k3_tech_report.pdf:14-15` @ 7c5be95

`k3_tech_report.pdf:14-15 ` — Unified white-box RL environment: the agent harness is a composable config, not a fixed scaffold. "Training with a single fixed agent harness can cause a model to overfit to a particular tool schema, system prompt, context management mechanism, or interaction protocol." The harness decomposes into modules — tool interfaces, system prompts, context management, skills, memories, subagents — composable into Kimi Code, Claude Code, Codex, OpenClaw, and Hermes, "as well as entirely new ones." Configs are built per task group during RL.

<a id="g58-f066"></a>
### Knowledge-graph-guided task synthesis pipeline (Figure 9)

`k3_tech_report.pdf:15-15` @ 7c5be95

`k3_tech_report.pdf:15-15 ` — Knowledge-graph-guided task synthesis pipeline (Figure 9). A self-evolving, hierarchical DAG starts from coarse seed nodes (CS/AI, Coding, Biomedicine, Humanities, Math, Chemistry, Physics, "…and more"); a per-node agent web-searches, checks for related concepts before adding nodes (edges coarse->fine), and stops once judged "sufficiently atomic." Synthesis samples nodes at varying granularity, merges keywords with ancestor context into queries, pulls materials (articles, blog posts, code repos), and picks one task type per instance.

<a id="g58-f067"></a>
### Verifiable agentic problem families, including a sandboxed visual-reasoning loop

`k3_tech_report.pdf:15-16` @ 7c5be95

`k3_tech_report.pdf:15-16 ` — Verifiable agentic problem families, including a sandboxed visual-reasoning loop. Beyond multi-step info search and professional-workflow deliverables (dozens–hundreds of steps in investment-banking/data-analysis/legal-practice tasks), visual-reasoning trajectories run in a Python interpreter: "the model iteratively writes and executes code to crop, zoom, or transform the input image, perform precise computation, or verify intermediate results, and receives the execution outputs — including generated images — as new observations over multiple interaction steps."

<a id="g58-f068"></a>
### Kernel optimization reward: correctness gate + roofline-relative score, evolving hacking detector

`k3_tech_report.pdf:16-16` @ 7c5be95

`k3_tech_report.pdf:16-16 ` — Kernel optimization reward: correctness gate + roofline-relative score, evolving hacking detector. Kernels (CUDA, Triton, CuTe DSL, Gluon, ThunderKittens, TileLang; BF16/FP8/FP4) get zero reward past a numerical-error threshold vs. PyTorch; otherwise scores against an expert implementation (matching it = 0.5, approaching roofline pushes toward 1). A detector penalizes CUDA graph replay, input caching, and precision reduction, "continuously extend[ed]... with new safeguards as new hacking strategies are observed."

<a id="g58-f069"></a>
### Personal Assistant environments: mock Gmail/Notion/Slack/Canvas, autonomously-built persistent worlds

`k3_tech_report.pdf:16-16` @ 7c5be95

`k3_tech_report.pdf:16-16 ` — Personal Assistant environments: mock Gmail/Notion/Slack/Canvas, autonomously-built persistent worlds. Mock apps preserve real-world semantics without API dependency/rate limits. Tasks (HR, legal, finance) run over simulated days; "a single rollout may involve up to thousands of interdependent tool calls and millions of context tokens," each event scored by deterministic rules or LLM evaluators. Agents build the workspace by web-searching reference material.

<a id="g58-f070"></a>
### Autonomous Execution Tasks (AET): verify-in-the-loop, two-tier verifier, no reference trajectory

`k3_tech_report.pdf:16-17` @ 7c5be95

`k3_tech_report.pdf:16-17 ` — Autonomous Execution Tasks (AET): verify-in-the-loop, two-tier verifier, no reference trajectory. Each task gives an initial state, goal, action space, execution budget, and verification interface, forcing self-decomposition, planning, error recovery, and termination decisions. Reward comes from the verifier's evaluation of final state, not self-report: agent-verifier isolation, a public-diagnostic + hidden held-out verifier pair, and penalty-based rewards under submission budgets. Figure 10: on the "Camera Repair Management System" task (rebuilding a hidden 3D web app via oracle queries), Kimi K3 scores 1.000 vs. Opus 4.8 (0.918), GPT-5.5 (0.893), and Kimi K2.6 (0.660).

<a id="g58-f071"></a>
### Web Development Tasks: cross-scaffold rollouts, dual reward, zeroed on fakery

`k3_tech_report.pdf:16-16` @ 7c5be95

`k3_tech_report.pdf:16-16 ` — Web Development Tasks: cross-scaffold rollouts, dual reward, zeroed on fakery. Tasks span one-line prompts to multi-paragraph specs — websites, games, 3D/WebGL, data viz, SVGs, full-stack apps — run in a containerized sandbox "under diverse agent scaffolds rather than a single fixed harness, to promote cross-scaffold generalization." Reward = deterministic functional/structural/pixel-similarity checks + model judging (inspects source or interacts with the artifact); zeroed when a project "fails to build, runs with errors, or fakes rather than implements the artifact."

<a id="g58-f072"></a>
### XTML markup replaces angle brackets with three reserved special tokens

`k3_tech_report.pdf:46-46` @ 7c5be95

`k3_tech_report.pdf:46-46 `, `k3_tech_report.pdf:12-12 ` — XTML markup replaces angle brackets with three reserved special tokens. The template ("XTML — eXtensible Token Markup Language") is XML-like but every structural boundary is a special token: `[open]`, `[sep]`, `[close]`, plus `[end_of_msg]` as the generation stop marker. An element is `[open]tag attr="value"[sep] ... [close]tag[sep]` — isomorphic to XML but tokenization-unambiguous at element boundaries, simplifying grammar-constrained decoding. Beyond serving: §4.1.1 states all SFT data is serialized in XTML to represent agentic trajectories.

<a id="g58-f073"></a>
### Three message categories with KV-cache-aware placement

`k3_tech_report.pdf:46-47` @ 7c5be95

`k3_tech_report.pdf:46-47 ` — Three message categories with KV-cache-aware placement. Input messages serialize `system`/`user`/`assistant`/`tool` roles. Global option messages (tool declaration `type="tool-declare"`, reasoning-effort) sit *before* them; one-shot options (`tool_choice`, `response_format`) go *after*, "so that per-request changes leave the history KV cache intact." A third kind, the input option message, interleaves mid-session to supplement/override a global option, announced via a `tool-declare` message "without rebuilding the preceding context."

<a id="g58-f074"></a>
### Assistant message body has three channels: think, response, tools

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — Assistant message body has three channels: think, response, tools. Channel concept: "inspired by OpenAI's Harmony response format." Mode is set by the generation prefix — `[open]think[sep]` for thinking mode, `[open]response[sep]` for instruct mode — not separate templates. Kimi K3 supports only *preserved* thinking: in thinking mode the `think` channel stays in history, "kept even when its content is empty," so the model sees a consistent structure across turns; instruct mode messages contain only `response` and `tools` channels.

<a id="g58-f075"></a>
### Tool-call encoding (Figure 16c)

`k3_tech_report.pdf:46-46` @ 7c5be95

`k3_tech_report.pdf:46-46 ` — Tool-call encoding (Figure 16c). Inside `[open]tools[sep]...[close]tools[sep]`, each call is `[open]call tool="python" index="1"[sep]` followed by typed argument blocks `[open]argument key="code" type="string"[sep] ... [close]argument[sep]`, then `[close]call[sep]`. A second call uses `index="2"` with `tool="search"` and an `object`-typed argument inline (e.g. `{"timeout": 150}`).

<a id="g58-f076"></a>
### Parallel tool calls and results are matched by tool+index

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — Parallel tool calls and results are matched by `tool`+`index`. "The index numbers parallel calls within a message, and each tool-result message repeats the same tool/index pair and follows the order of its call, so that results are unambiguously associated with calls." Arguments are typed: strings appear as raw text (code is first-class, not escaped JSON), non-string JSON types compactly serialized. A pure-JSON fallback covers non-decomposable arguments, but "it occurs only in input tokens, never in model outputs, and its loss is masked during training" — the model itself never emits it.

<a id="g58-f077"></a>
### Reasoning effort is a natural-language option message, not a generation-prefix token/param

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — Reasoning effort is a natural-language option message, not a generation-prefix token/param. Exposed as a global option message of `type="thinking-effort"`, inserted after the tool declaration and before input messages: "the message states the requested level in natural language and acts as a generation-constraint instruction." The schema reserves four levels (`low`, `medium`, `high`, `max`), of which Kimi K3 "supports a subset." The same pattern covers `tool_choice` and `response_format`.

<a id="g58-f078"></a>
### API-level contract for preserved thinking

`README.md:617-619` @ 7c5be95

`README.md:617-619 ` — API-level contract for preserved thinking. "Kimi K3 always has thinking enabled, and will return `reasoning_content`. Thinking effort is configured with the top-level `reasoning_effort` request field, which supports `"low"`, `"high"`, and `"max"` (default `"max"`)." Multi-turn/tool-call conversations require passing the prior assistant message back into `messages` as-is, "including `reasoning_content` and `tool_calls`, not just `content`."

<a id="g58-f079"></a>
### Worked code example for preserved-thinking round-trip

`README.md:621-651` @ 7c5be95

`README.md:621-651 ` — Worked code example for preserved-thinking round-trip. A `chat_with_preserved_thinking` function shows a 3-turn `messages` list where the middle assistant turn carries both `reasoning_content` and `content`, with the call passing `reasoning_effort="max"`; a comment shows the model recalling numbers (215, 222) from the prior turn's `reasoning_content`, proving the reasoning trace is read back, not cosmetic.

<a id="g58-f080"></a>
### Points to external docs (Kimi K3 Quickstart, Thinking Effort guide) for "vision input,…

`README.md:653-653` @ 7c5be95

`README.md:653-653 ` — Points to external docs (Kimi K3 Quickstart, Thinking Effort guide) for "vision input, structured output, partial mode, tool choice, dynamic tool loading, context caching" — confirming "dynamic tool loading" is supported, corroborating the appendix's mid-session `tool-declare` mechanism.

## Patterns worth porting

<a id="g58-f081"></a>
### Scaled-tanh softcap as a drop-in bound for unbounded gated units

`k3_tech_report.pdf:7-8` @ 7c5be95

`k3_tech_report.pdf:7-8 `, `k3_tech_report.pdf:43-43 ` — Scaled-tanh softcap as a drop-in bound for unbounded gated units. SiTU-GLU applies `softcap(x, β) = β·tanh(x/β)` to *both* multiplicative factors of a SwiGLU-style gate (`β1=4` gate branch, `β2=25` up branch), giving a hard bound `‖·‖∞ ≤ β1β2 = 100` while matching the unbounded function to first order near the origin (`β tanh(z/β) = z + O(z³/β²)`) and recovering it exactly as `β->∞`. Unlike hard clamping, gradients stay nonzero away from saturation — reusable wherever a gate risks low-precision overflow.

<a id="g58-f082"></a>
### Load-balancing-by-bias reframed as bipartite assignment, solved via alternating quantiles

`k3_tech_report.pdf:43-44` @ 7c5be95

`k3_tech_report.pdf:43-44 ` — Load-balancing-by-bias reframed as bipartite assignment, solved via alternating quantiles. QB relaxes the balanced top-k assignment LP, takes its Lagrangian dual (integral, so exact), and shows the closed-form per-token/per-expert minimizers are quantiles of a score-margin distribution — Algorithm 1's two-line alternating solver (`α <- desc_sort(s-β)[:,k:k+1]`; `β <- desc_sort(s-α)[mk/n:mk/n+1]`). Generalizes beyond MoE routing to any "assign items to bins under a capacity constraint using a per-item score" problem.

<a id="g58-f083"></a>
### Exact coordinate minimization beats SignSGD, no learning-rate hyperparameter needed

`k3_tech_report.pdf:44-44` @ 7c5be95

`k3_tech_report.pdf:44-44 ` — Exact coordinate minimization beats SignSGD, no learning-rate hyperparameter needed. The classical fixed-step sign update for auxiliary-loss-free balancing is a SignSGD step on QB's dual subgradient (Eq. 27) — QB jumps to the exact per-coordinate minimizer, eliminating step-size tuning and converging within a few steps at ~10³ experts.

<a id="g58-f084"></a>
### Streaming histogram quantile estimation avoids gathering raw values across shards

`k3_tech_report.pdf:44-45` @ 7c5be95

`k3_tech_report.pdf:44-45 ` — Streaming histogram quantile estimation avoids gathering raw values across shards. Each rank scatter-adds into a per-expert histogram (bin range re-derived from the bias spread), one integer all-reduce sums counts, and the quantile is read via linear interpolation where cumulative count hits the target. Error is bounded by bin width (a few ×10⁻³ at B=1000 bins); communication is independent of token count `m` — <1% the raw-margin-exchange cost per micro-batch. A generic pattern for streaming quantiles under communication budgets.

<a id="g58-f085"></a>
### Bounding "attend-over-everything-so-far" cost by block-summarizing the history

`k3_tech_report.pdf:6-6` @ 7c5be95

`k3_tech_report.pdf:6-6 ` — Bounding "attend-over-everything-so-far" cost by block-summarizing the history. Block AttnRes reduces a cross-depth (or, by analogy, cross-time) attention-over-all-history pattern to block-level sums plus one running intra-block partial term, capping the O(N²) cost of any "let each step selectively read all prior steps" mechanism.

<a id="g58-f086"></a>
### Per-schedule hyperparameter search before comparing LR schedules

`k3_tech_report.pdf:10-11` @ 7c5be95

Per-schedule hyperparameter search before comparing LR schedules (`k3_tech_report.pdf:10-11 `) — teams comparing cosine vs. WSD should search each schedule's batch size/peak LR rather than reuse one schedule's tuned hyperparameters for both; K3's account counters "WSD matches cosine" claims that skip this.

<a id="g58-f087"></a>
### Rephrase-then-verify-fidelity as a data-quality gate

`k3_tech_report.pdf:10-10` @ 7c5be95

Rephrase-then-verify-fidelity as a data-quality gate (`k3_tech_report.pdf:10-10 `) — a fidelity-verification pass against source documents post-rephrase is a reusable guardrail against synthetic-data drift/hallucination in corpus augmentation.

<a id="g58-f088"></a>
### NoPE + gated-recurrence positional encoding as a route to context extrapolation without RoPE surgery

`k3_tech_report.pdf:12-12` @ 7c5be95

NoPE + gated-recurrence positional encoding as a route to context extrapolation without RoPE surgery (`k3_tech_report.pdf:12-12 `) — worth considering for any team hitting RoPE-interpolation instability at extreme context lengths.

<a id="g58-f089"></a>
### Synthesize cross-document permutation tasks to force genuine long-range attention

`k3_tech_report.pdf:12-12` @ 7c5be95

Synthesize cross-document permutation tasks to force genuine long-range attention (`k3_tech_report.pdf:12-12 `) — a generalizable recipe for context-extension data resisting a model's "attend only locally" shortcuts.

<a id="g58-f090"></a>
### Concentrate long-sequence compute in a cooldown stage, not training long-context from step one

`k3_tech_report.pdf:12-12` @ 7c5be95

Concentrate long-sequence compute in a cooldown stage, not training long-context from step one (`k3_tech_report.pdf:12-12 `) — a cost-control pattern for any team extending context length on a fixed compute budget.

<a id="g58-f091"></a>
### The knowledge-graph construction (dedup-before-insert via graph exploration, coarse->fine…

`k3_tech_report.pdf:15-15` @ 7c5be95

`k3_tech_report.pdf:15-15 ` — The knowledge-graph construction (dedup-before-insert via graph exploration, coarse->fine edge direction, atomicity stopping rule) is a reusable recipe for any RL-task-synthesis effort, independent of Kimi's domains.

<a id="g58-f092"></a>
### The budget-multiplier trick (estimate a baseline from the cold-start/SFT model, gate…

`k3_tech_report.pdf:13-13` @ 7c5be95

`k3_tech_report.pdf:13-13 ` — The budget-multiplier trick (estimate a baseline from the cold-start/SFT model, gate reward on exceeding τ×baseline) is reused twice — reasoning-token budget, and GRM output-length/verbosity — a general-purpose lever for controlling length via reward, not decoding constraints.

<a id="g58-f093"></a>
### The AET public/hidden verifier split (queryable diagnostic verifier, held-out hidden…

`k3_tech_report.pdf:16-17` @ 7c5be95

`k3_tech_report.pdf:16-17 ` — The AET public/hidden verifier split (queryable diagnostic verifier, held-out hidden scorer) plus submission-budget penalties is a portable template for any environment where the "does this work" check must be visible to the agent, the true grading signal ungameable.

<a id="g58-f094"></a>
### Treating the *harness* (tools, system prompt, context management, skills, memory,…

`k3_tech_report.pdf:14-15` @ 7c5be95

`k3_tech_report.pdf:14-15 ` — Treating the *harness* (tools, system prompt, context management, skills, memory, subagents) as a sampled/composed configuration space during RL — not one fixed scaffold — is a portable way to prevent overfitting an agent to a single product's tool schema.

<a id="g58-f095"></a>
### AgentENV's sandbox lifecycle (pause/resume/fork/snapshot) is a pattern for any RL-over-tools loop

`k3_tech_report.pdf:22-22` @ 7c5be95

`k3_tech_report.pdf:22-22 ` — AgentENV's sandbox lifecycle (pause/resume/fork/snapshot) is a pattern for any RL-over-tools loop, not just million-token agentic RL: incremental dirty-page checkpointing keeps checkpoint cost proportional to mutation, not sandbox size; "pause" is a near-free parking state for sandboxes blocked on inference; "fork" a cheap way to get an isolated copy for side-effect-free eval. A team without Firecracker-scale infra could replicate the pause/fork/snapshot *interface* over a lighter container or VM.

<a id="g58-f096"></a>
### Write-back (not write-through) caching for any stateful, expensive-to-recompute cache

`k3_tech_report.pdf:21-21` @ 7c5be95

`k3_tech_report.pdf:21-21 ` — Write-back (not write-through) caching for any stateful, expensive-to-recompute cache. The external-KV-cache-pool design — keep hot state resident, spill to slower storage on eviction, prefetch back on reuse, keep co-dependent state lifecycles aligned — generalizes beyond KDA/MLA to any fast/small-cache-over-slow/large-storage system where recompute cost is high.

<a id="g58-f097"></a>
### Decoupling the hash key's granularity from the storage/checkpoint unit's granularity

`k3_tech_report.pdf:23-24` @ 7c5be95

`k3_tech_report.pdf:23-24 ` — Decoupling the hash key's granularity from the storage/checkpoint unit's granularity underlies the KDA prefix-cache fix: index at fine granularity for match precision, checkpoint/persist only at coarse boundaries (conversation turns). Any cache keyed on expensive-to-produce state can use this two-level scheme instead of one granularity serving both purposes.

<a id="g58-f098"></a>
### Consistent-hashing primary/secondary affinity distributes failover cost, not eliminating it

`k3_tech_report.pdf:25-25` @ 7c5be95

`k3_tech_report.pdf:25-25 ` — Consistent-hashing primary/secondary affinity distributes failover cost, not eliminating it — a small-scale fleet can borrow the failover-distribution mechanic to bound blast radius of any node/cluster loss, whether the cache is KV, prefix, or otherwise.

<a id="g58-f099"></a>
### The greedy overloaded->underloaded migration proof is a reusable load-balancing recipe

`k3_tech_report.pdf:45-45` @ 7c5be95

`k3_tech_report.pdf:45-45 ` — The greedy overloaded->underloaded migration proof is a reusable load-balancing recipe: any assignment problem where "redundant slots per bucket" needs a provable worst-case bound can reuse the argument structure (saturate the most-underloaded bucket from one overloaded source, each bucket touched by at most one source) for an O(E/R)-style guarantee without runtime LP-solving.

<a id="g58-f100"></a>
### Cross-vendor judge to avoid self-preference bias

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 ` — Cross-vendor judge to avoid self-preference bias. MCP-Atlas uses Gemini 3.1 Pro as judge (not a Moonshot/Kimi model), on a 500-task public subset with a 100-turn limit — a reusable pattern for de-biasing an agentic-eval judge.

<a id="g58-f101"></a>
### Reporting the harness-mitigated number alongside the raw one

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 ` — Reporting the harness-mitigated number alongside the raw one. BrowseComp's headline (91.2%) uses a context-compaction strategy triggered at 300K tokens; the full 1M-token window with no context management scores 90.4% — isolating context management as a variable, not folding it into the result. Restated at `README.md:591-591 `, a hint long-context agent loops are expected to compact, not run to the full window.

<a id="g58-f102"></a>
### Per-cell fallback/refusal disclosure instead of silent averaging

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 `, `k3_tech_report.pdf:29-29 ` — Per-cell fallback/refusal disclosure instead of silent averaging. Table 3's footnotes tally baseline fallbacks and refusals ("13 fallbacks and 1 refusal out of 80 tasks," "Includes 14 tasks that Claude Fable 5 refused to answer," etc.); elsewhere, Claude Fable 5 "hits fallbacks on 35% of the tasks" on SWE-Marathon — separating genuine capability from safety-triggered non-answers.

<a id="g58-f103"></a>
### Dated, harness-attributed third-party sourcing

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 ` — Dated, harness-attributed third-party sourcing. Every external number carries a source and date (e.g., Artificial Analysis and Agents' Last Exam, both "as of July 23, 2026"), and the paper names the harness per model (Kimi K3 with Kimi Code; GPT models with Codex; Claude models and GLM-5.2 with Claude Code) — a template for scaffolding-transparent comparisons.

<a id="g58-f104"></a>
### Failure-mode taxonomy derived from unsolved cases

`k3_tech_report.pdf:31-31` @ 7c5be95

`k3_tech_report.pdf:31-31 ` — Failure-mode taxonomy derived from unsolved cases. Instead of a pass rate, exploit-dev-miss trajectories bucket into four modes: (i) can't finish the last stage of an exploit chain from primitives already obtained, (ii) wrong strategy under mitigations (e.g., persisting with control-flow hijacking when a data-only attack would work), (iii) trapped in unproductive debugging loops, (iv) insufficient verification of the deliverable before submission — a template for post-hoc failure analysis.

<a id="g58-f105"></a>
### Triangulating a safety-relevant self-report against a named external audit

`k3_tech_report.pdf:31-31` @ 7c5be95

`k3_tech_report.pdf:31-31 ` — Triangulating a safety-relevant self-report against a named external audit. The cyber-capability claim is cross-checked against a joint UK AI Security Institute + NIST CAISI assessment on a suite (ExploitBench, 32% vs. 24% for the baseline; 17 vs. 11 steps on a 32-step simulated enterprise network a human expert takes ~20 hours to complete), reaching "conclusions consistent with ours."

<a id="g58-f106"></a>
### Public artifact release to make an agentic case-study claim independently checkable

`k3_tech_report.pdf:33-33` @ 7c5be95

`k3_tech_report.pdf:33-33 ` — Public artifact release to make an agentic case-study claim independently checkable. The chip-design case study (a 48-hour autonomous Kimi Code run building/optimizing/verifying an inference-chip prototype with open-source EDA tools and the Nangate45 standard-cell library, closing timing at 100MHz with >8,700 tokens/s RTL-simulated decode throughput) ships its RTL code on GitHub, not resting on reported numbers alone.

<a id="g58-f107"></a>
### Split options by cache sensitivity, not by semantics

`k3_tech_report.pdf:46-46` @ 7c5be95

`k3_tech_report.pdf:46-46 ` — Split options by cache sensitivity, not by semantics. Session-scoped options (tools, reasoning effort) go before the transcript, request-scoped ones (`tool_choice`, `response_format`) after — a reusable harness pattern that lets a serving layer keep a stable KV-cache prefix across requests that only vary in per-call options, accepting invalidation only for rare changes.

<a id="g58-f108"></a>
### Encode new request options as natural-language instructions, not new syntax

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — Encode new request options as natural-language instructions, not new syntax. The authors' "low-alignment-tax" principle: because a pretrained model follows natural-language instructions, new options (`tool_choice`, `response_format`, `thinking-effort`) can be added "with little or no additional training." Worth porting to any harness designing new control knobs.

<a id="g58-f109"></a>
### Typed tool arguments avoid JSON-in-JSON escaping

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — Typed tool arguments avoid JSON-in-JSON escaping. Treating `string`-typed arguments as raw text (not JSON-quoted strings) means code, shell commands, or free text needs no escaping/unescaping — a pain point in OpenAI-style function calling where code arguments must be JSON-string-encoded.

<a id="g58-f110"></a>
### Always-present-but-possibly-empty think channel

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — Always-present-but-possibly-empty think channel. Keeping the `think` channel present even when empty gives the model a "consistent message structure across turns" — a generalizable trick for harnesses that toggle reasoning on/off per turn.

## Open threads / weak spots

<a id="g58-f111"></a>
### gmin = -5 is stated as fixed, not derived or ablated

`k3_tech_report.pdf:5-5` @ 7c5be95

`k3_tech_report.pdf:5-5 ` — `gmin = -5` is stated as fixed, not derived or ablated — a hyperparameter chosen by design/trial, not shown swept.

<a id="g58-f112"></a>
### Full Attention Residuals is only "affordable" because depth is modest (L < 100)

`k3_tech_report.pdf:6-6` @ 7c5be95

`k3_tech_report.pdf:6-6 ` — Full Attention Residuals is only "affordable" because depth is modest (L < 100); the paper's justification is scale-dependent; Block AttnRes exists because O(L²d)/O(Ld) memory doesn't hold up otherwise — a design needing re-derivation at much greater depth.

<a id="g58-f113"></a>
### BIP (inequality-constrained variant) was reported to underperform

`k3_tech_report.pdf:44-44` @ 7c5be95

`k3_tech_report.pdf:44-44 ` — BIP (inequality-constrained variant) was reported to underperform: its non-negativity constraints on α/β "can only suppress over-selected experts without promoting under-selected ones, and markedly slows equilibration in our experiments" — included for context, not as the chosen method.

<a id="g58-f114"></a>
### The histogram quantile estimator is an approximation with an acknowledged error bound

`k3_tech_report.pdf:45-45` @ 7c5be95

`k3_tech_report.pdf:45-45 ` — The histogram quantile estimator is an approximation with an acknowledged error bound (bin width `w`, "a few 10⁻³" residual at B=1000), not an exact computation — the paper reports "no measurable residual load imbalance" but concedes the estimate is bin-limited, noting an EMA-of-quantiles refinement as a (not yet default) improvement.

<a id="g58-f115"></a>
### The paper admits SwiGLU's empirical success is theoretically unexplained

`k3_tech_report.pdf:7-7` @ 7c5be95

`k3_tech_report.pdf:7-7 ` — The paper admits SwiGLU's empirical success is theoretically unexplained ("a complete account of its empirical effectiveness remains open"), so SiTU-GLU's design goal — preserve SwiGLU's near-origin shape while bounding it — is a heuristic match to an already-unexplained baseline, not a principled derivation.

<a id="g58-f116"></a>
### MoonViT-V2's win over SigLIP-init is stability, not quality

`k3_tech_report.pdf:9-9` @ 7c5be95

`k3_tech_report.pdf:9-9 ` — MoonViT-V2's win over SigLIP-init is stability, not quality — it "matches" (not exceeds) the SigLIP-initialized baseline on vision evals; training from scratch buys optimization stability — a trade, not an improvement.

<a id="g58-f117"></a>
### The headline "2.5× scaling efficiency" claim is measured as FLOPs-to-reach-equal-validation-loss on held-out OOD data from fitted scaling-law curves (Fig

`k3_tech_report.pdf:10-11` @ 7c5be95

`k3_tech_report.pdf:10-11 ` — The headline "2.5× scaling efficiency" claim is measured as FLOPs-to-reach-equal-validation-loss on held-out OOD data from fitted scaling-law curves (Fig. 7), not a measured gap between K2 and K3 on downstream benchmarks; the paper doesn't ablate which of the changes (KDA-MLA hybrid, SiTU-GLU, Per-Head Muon, wider MoE, rephrased data, etc.) drives how much of the gain.

<a id="g58-f118"></a>
### The paper flags that its cosine-beats-WSD finding contradicts prior published results,…

`k3_tech_report.pdf:10-11` @ 7c5be95

`k3_tech_report.pdf:10-11 ` — The paper flags that its cosine-beats-WSD finding contradicts prior published results, attributed to differing per-schedule hyperparameters — a plausible but self-reported explanation not verified against the contradicted work.

<a id="g58-f119"></a>
### The claim that synthetic permutation/concatenation data is necessary because "length alone does not confer long-range capability" is motivation, but no ablation number (e.g., long-context eval with vs

`k3_tech_report.pdf:12-12` @ 7c5be95

`k3_tech_report.pdf:12-12 ` — The claim that synthetic permutation/concatenation data is necessary because "length alone does not confer long-range capability" is motivation, but no ablation number (e.g., long-context eval with vs. without the synthetic data) quantifies the effect.

<a id="g58-f120"></a>
### Kernel-task hacking detection is framed as reactive/ongoing

`k3_tech_report.pdf:16-16` @ 7c5be95

`k3_tech_report.pdf:16-16 ` — Kernel-task hacking detection is framed as reactive/ongoing: the team "continuously extend[s] it with new safeguards as new hacking strategies are observed during Kimi K3's development," implying the detector lags novel exploits (CUDA graph replay, input caching, precision reduction caught so far, not necessarily all).

<a id="g58-f121"></a>
### The agentic GRM's verbosity-hacking countermeasure is an admission the tournament-style…

`k3_tech_report.pdf:13-13` @ 7c5be95

`k3_tech_report.pdf:13-13 ` — The agentic GRM's verbosity-hacking countermeasure is an admission the tournament-style judge was gameable via length before this fix.

<a id="g58-f122"></a>
### MOPD's fine-grained top-k distillation objective was dropped, showing "no clear…

`k3_tech_report.pdf:14-14` @ 7c5be95

`k3_tech_report.pdf:14-14 ` — MOPD's fine-grained top-k distillation objective was dropped, showing "no clear advantage" over the simple clipped log-ratio reward — an unelaborated negative result, so the magnitude of the difference is unstated.

<a id="g58-f123"></a>
### Web Development reward guards against agents that "fake rather than implement the…

`k3_tech_report.pdf:16-16` @ 7c5be95

`k3_tech_report.pdf:16-16 ` — Web Development reward guards against agents that "fake rather than implement the artifact," implying an observed failure mode requiring a zero-reward carve-out.

<a id="g58-f124"></a>
### A naive-caching failure mode the paper had to route around

`k3_tech_report.pdf:23-23` @ 7c5be95

`k3_tech_report.pdf:23-23 ` — A naive-caching failure mode the paper had to route around: tying prefix-hash granularity to KDA's storage-block size (1024–6144 tokens) makes caching "nearly useless" — short requests can never hit; chunked prefill exports no reusable prefix until crossing a 6144-token boundary. Avoided by the decoupled hash/checkpoint design above.

<a id="g58-f125"></a>
### Exact per-step optimal balancing is admittedly infeasible

`k3_tech_report.pdf:19-19` @ 7c5be95

`k3_tech_report.pdf:19-19 ` — Exact per-step optimal balancing is admittedly infeasible. MoonEP falls back to offline ILP solutions as references plus an online near-optimal heuristic kernel — an approximation, not a runtime-optimality claim, correctness resting on the proven E/R bound, not on hitting the true optimum every step.

<a id="g58-f126"></a>
### In-place recurrent-state update is at odds with speculative-decoding rollback

`k3_tech_report.pdf:24-24` @ 7c5be95

`k3_tech_report.pdf:24-24 ` — In-place recurrent-state update is at odds with speculative-decoding rollback. The paper frames this as an architectural friction point ("problematic," would require per-draft-position state snapshots to solve naively) before the projected-input-caching workaround — KDA's O(1) state is cheap to carry but expensive to roll back mid-verification.

<a id="g58-f127"></a>
### The E/R redundant-expert reservation is worst-case tight, not merely a safe upper bound

`k3_tech_report.pdf:45-45` @ 7c5be95

`k3_tech_report.pdf:45-45 ` — The E/R redundant-expert reservation is worst-case tight, not merely a safe upper bound. Theorem 2 (stated but not proved on this page) asserts router outputs exist achieving M ≈ E/R, meaning the reserved redundant-expert budget can be consumed — no slack to trim without risking infeasible plans on adversarial/skewed routing.

<a id="g58-f128"></a>
### Research-level reasoning is a named, conceded gap

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 `, `k3_tech_report.pdf:27-27 ` — Research-level reasoning is a named, conceded gap. HLE-Full trails Claude Fable 5 and GPT-5.6 Sol both with and without tools (43.5%/56.0% for Kimi K3 vs. 53.3%/63.0% and 44.5%/58.0%); CritPt scores 23.4% vs. 27.1–32.3% for the three strongest baselines — called out as "a key direction for improvement" (Table 2).

<a id="g58-f129"></a>
### Elo-rated knowledge-work leaderboards are still led by Claude Fable 5

`k3_tech_report.pdf:28-28` @ 7c5be95

`k3_tech_report.pdf:28-28 ` — Elo-rated knowledge-work leaderboards are still led by Claude Fable 5. Kimi K3 places third on GDPval-AA v2 (1,686 vs. 1,747) and second on AA-Briefcase (1,548 vs. 1,583); the computer-use suites OSWorld 2.0 and SaaS-Bench "are still led by Claude Fable 5 or GPT-5.6 Sol."

<a id="g58-f130"></a>
### In-house suite pinpoints weak spots

`k3_tech_report.pdf:30-30` @ 7c5be95

`k3_tech_report.pdf:30-30 ` — In-house suite pinpoints weak spots. Exceptions to an otherwise strong showing: Kimi K3 trails leaders on Agent Behavior Bench, MIRA Bench, 24/7 ClawBench 2.0, Agentic Vision Bench, and KWV Bench.

<a id="g58-f131"></a>
### Exploit development has a hard ceiling

`k3_tech_report.pdf:31-31` @ 7c5be95

`k3_tech_report.pdf:31-31 `, `k3_tech_report.pdf:32-32 ` — Exploit development has a hard ceiling. "Neither model solves three-quarters of the tasks" on the 20-task Linux-kernel-exploitation track; CAISI independently finds Kimi K3 achieves arbitrary code execution on 0/41 tasks and trails frontier cyber-capable models on full exploits. The authors frame their result as "a lower bound on capability," conditioned on model version and eval coverage.

<a id="g58-f132"></a>
### Structural blind spot in the cyber eval

`k3_tech_report.pdf:30-30` @ 7c5be95

`k3_tech_report.pdf:30-30 ` — Structural blind spot in the cyber eval. Anthropic and OpenAI frontier models are excluded from the cybersecurity comparison because they refuse cyber-related tasks, so there's no apples-to-apples proprietary baseline here.

<a id="g58-f133"></a>
### Third-party leaderboards corroborate, not soften, the gap

`k3_tech_report.pdf:31-31` @ 7c5be95

`k3_tech_report.pdf:31-31 `, `k3_tech_report.pdf:32-32 ` — Third-party leaderboards corroborate, not soften, the gap. 4th of 580 on Artificial Analysis's Intelligence Index v4.1 (57.1, behind Claude Fable 5's 59.9 and GPT-5.6 Sol's 58.9), 2nd of 39 on the Vals Index, and 4th of 37 on the new Agent Arena (9.1 vs. 12.7/10.1/9.8) — though Kimi K3 ranks 1st of 99 on WebDev Arena, "the first open model to top this leaderboard." Table 5 notes: some Text Arena baseline entries use `xhigh`/`high` effort variants, not the `max`/`xhigh` in the main columns.

<a id="g58-f134"></a>
### A visible methodology patch in the vision eval

`k3_tech_report.pdf:26-26` @ 7c5be95

`k3_tech_report.pdf:26-26 ` — A visible methodology patch in the vision eval. WorldVQA shows "consistent refusal behavior... across models," so a usable score required forcing an answer via prompt engineering — the benchmark is relabeled "WorldVQA ForceAnswer" in Table 2, signaling the reported number reflects a modified protocol, not native model behavior.

<a id="g58-f135"></a>
### Reasoning-effort level count is inconsistent

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 `, `README.md:617-617 ` — Reasoning-effort level count is inconsistent. The appendix says the schema "reserves four levels (low, medium, high, and max), of which Kimi K3 supports a subset," but the README's API contract lists only three: `"low"`, `"high"`, and `"max"` — `medium` is absent from the documented request field, so a harness author could pass an unsupported value.

<a id="g58-f136"></a>
### No image/multimodal placeholder token is described in the read pages

`k3_tech_report.pdf:46-47` @ 7c5be95

`k3_tech_report.pdf:46-47 ` — No image/multimodal placeholder token is described in the read pages, despite K3's vision encoder (`README.md:112-118` — MoonViT-V2, 401M params). The excerpt (pp. 46-47) covers only text/tool/reasoning structure; how image content is delimited in a user or tool message is undocumented.

<a id="g58-f137"></a>
### No description of tool-error surfacing

`k3_tech_report.pdf:47-47` @ 7c5be95

`k3_tech_report.pdf:47-47 ` — No description of tool-error surfacing. The spec covers how a tool *call* and its *result* are paired via `tool`/`index`, but nothing here describes how a failed tool execution is represented back to the model (error field vs. plain text result vs. status attribute) — a harness author must guess elsewhere.

<a id="g58-f138"></a>
### Naming mismatch in the sample code

`README.md:619-619` @ 7c5be95

`README.md:619-619 `, `README.md:649-649 ` — Naming mismatch in the sample code. The request-side field is `reasoning_content` (per prose at line 619 and the message dict at line 632), but the example accesses `response.choices[0].message.reasoning` (line 649), not `.reasoning_content` — either a README typo or a send/receive asymmetry; copy-pasting hits an attribute-name mismatch.

<a id="g58-f139"></a>
### Deployment section names three engines (vLLM, SGLang, TokenSpeed) but gives no inline…

`README.md:605-613` @ 7c5be95

`README.md:605-613 ` — Deployment section names three engines (vLLM, SGLang, TokenSpeed) but gives no inline serving flags, GPU/VRAM requirements, or quantization-format notes per engine — all deferred to recipe links.


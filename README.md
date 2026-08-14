<div align="center">

# 📗 dsh-extension-workbook

**高保真、fail-closed 的 Excel XLSX/XLSM 工作簿检视、读取、渲染、编辑、比对与验证工具 —— 移植自 @firstpick/pi-extension-workbook**

[中文](#中文) · [English](#english)

![license](https://img.shields.io/badge/license-MIT-blue.svg)
![node](https://img.shields.io/badge/node-%3E%3D24-green.svg)
![dsh](https://img.shields.io/badge/dsh-plugin-0.1.0--rc.6-purple.svg)
![format](https://img.shields.io/badge/format-xlsx%20%7C%20xlsm-orange.svg)

</div>

---

## 中文

**在 DeepSeek Harness 里安全地检视、渲染、编辑与验证 Excel 工作簿：不执行宏、不刷新外部链接、所有写入都有 SHA-256 冲突保护与 dry-run 先行，任何不支持或可能有损的操作一律 fail-closed。**

### 功能

- 检视 `.xlsx` 与 `.xlsm` 工作簿而不改动它（工作表、区域、OOXML 部件、链接、受保护的宏内容、哈希、校验状态）。
- 渲染工作表与指定区域为确定性 PNG，便于视觉检查格式与布局。
- 通过受保护的提交流程（dry-run 规划 → `expectedSha256` 冲突检查 → 原子写入 → 提交后校验）编辑选中单元格与工作簿内容。
- 对比两个工作簿的结构与内容，并在接受结果前校验其完整性。
- 保留上游 `workbook-editor` skill（原样、未翻译），内置六把 `workbook_*` 工具与 `workbook-doctor` 诊断命令。

### 效果

- **Fail-closed**：任何无法以字节级保真处理的包（ZIP64、加密、共享/数组/数据表/溢流公式区域、不可变受保护部件）都会明确拒绝，而不是静默降级。
- **可验证**：每次提交都要求 `expectedSha256`，写入后立即校验并支持与基线比对；就地编辑会先留恢复副本。
- **不碰宏**：只清点、保留与校验 VBA 等受保护内容，从不执行或修改。
- **可审计**：模型可见输出有上限，超出时完整 JSON 落到临时文件并给出路径，不截断信息。

### 安装

```bash
git clone https://github.com/GongYuanCaiJi/dsh-extension-workbook.git
cd dsh-extension-workbook
npm install
dsh plugin --profile <profile> add ./dsh-extension-workbook
```

本包尚未发布到 npm，请使用本地路径或 `github:` 安装；需要 Node.js 24 或更新版本。安装后重启 dsh 让插件生效。

### 使用

引用或给出 `.xlsx` / `.xlsm` 文件路径，然后描述你要的结果：

> 检视这个工作簿，修正 Summary 表中的合计，保持格式不变，并展示校验结果。

建议先 `workbook_inspect` 或 `workbook_render` 熟悉文件，审阅建议的单元格改动，最后比对与校验满意后再保留编辑后的文件。

### 移植说明

本插件是 [@firstpick/pi-extension-workbook](https://www.npmjs.com/package/@firstpick/pi-extension-workbook)（MIT）的 dsh 移植（port），上游代码按「100% 原样复制、只做必要适配」的规则保留；每一处适配都记录在 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。上游的文字（skill 与 docs）是英文而本项目受众以中文为主，按原样复制规则**未翻译**，保留原文。如果上游对你有帮助，[也给上游一个 star](https://github.com/Firstp1ck/pi-coding-agent-forge)。更多移植规范见 [deepseek-harness 移植 playbook](https://github.com/GongYuanCaiJi/deepseek-harness/blob/main/docs/port-playbook.md)。

---

## English

**Inspect, render, edit, diff, and validate Excel workbooks in DeepSeek Harness with a fail-closed, hash-guarded workflow: no macro execution, no external-data refresh, dry-run first, and every commit protected by SHA-256 conflict checks.**

This is a dsh port of the Pi extension [@firstpick/pi-extension-workbook](https://www.npmjs.com/package/@firstpick/pi-extension-workbook) (MIT) — see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for the pinned upstream artifact and every adaptation. Please [star the upstream repo](https://github.com/Firstp1ck/pi-coding-agent-forge) too. The upstream skill and docs remain verbatim English (the port rule forbids translating them).

### Features

- Inspects `.xlsx` and `.xlsm` workbooks without changing them.
- Renders sheets and focused ranges to deterministic PNGs so formatting can be checked visually.
- Edits selected cells and workbook content through a guarded workflow: dry-run planning, `expectedSha256` conflict protection, atomic writes, post-commit validation.
- Diffs two workbooks by sheets, values, formulas, styles, part hashes, and protected content; validates structure before the result is accepted.
- Ships the upstream `workbook-editor` skill, six `workbook_*` tools, and a `workbook-doctor` diagnostic command.

### What you get

- **Fail-closed**: packages the engine cannot process with byte-level fidelity (ZIP64, encrypted, shared/array/data-table/spill formula regions, immutable protected parts) are rejected loudly, never silently downgraded.
- **Verifiable**: every commit requires `expectedSha256`; outputs are validated immediately and against an optional baseline; in-place edits keep a recovery copy.
- **Macro-safe**: protected active content is inventoried, preserved, and verified — never executed or edited.
- **Bounded output**: model-visible results are capped; oversized JSON is written to a temp artifact whose path is returned.

### Install

```bash
git clone https://github.com/GongYuanCaiJi/dsh-extension-workbook.git
cd dsh-extension-workbook
npm install
dsh plugin --profile <profile> add ./dsh-extension-workbook
```

Not published to npm yet — use the local path or a `github:` install. Requires Node.js 24+. Restart dsh after installing so the plugin loads.

### Usage

Attach or reference the `.xlsx` / `.xlsm` file, then describe the result you want:

> Inspect this workbook, correct the totals in the Summary sheet, preserve the formatting, and show me the validation result.

Start with inspection or rendering, review the proposed cell changes, and keep the edited file only after the final comparison and validation are satisfactory.

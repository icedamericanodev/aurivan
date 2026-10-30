# CRISC Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CRISC question bank
(`data/crisc/originals/d{N}.json`). Started 30 Oct 2026 with the pilot batches
(`crisc_d1_001`–`020` … `crisc_d4_001`–`020`).

**Format** (same as `data/cc/originals/_framework_library.md`):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly.
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it.

**Status key:**
- **Verified:** the section, control or definition was checked against the
  source (opened on isaca.org, csrc.nist.gov or nvlpubs.nist.gov).
  **Verified (title):** the publication or objective title was confirmed on
  the publisher's site; the fit to the item is judged separately (used for
  paid ISACA publications whose full text can't be opened).
- **Likely:** the edition is current and the title matches, but the source was
  not opened. Check it before release.

**One form everywhere.** `<publisher> <document> <edition> <locator> (<title or
short paraphrase>)`, with no comma anywhere before the parenthesis. One
citation per `;`-separated part. COBIT objectives are written
`COBIT 2019 APO12 (Managed Risk)`. NIST forms follow the CC library.

**Not citable yet** (hosts blocked in the cloud environment, so not opened):
ISO 31000:2018, ISO/IEC 27005:2022, ISO/IEC 27001:2022, COSO ERM (2017), the
IIA Three Lines Model (2020), EU GDPR and the EU AI Act. Name them in notes
as context only.

---

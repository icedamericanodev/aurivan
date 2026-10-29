/**
 * The Field Guide kit (mobile 1.51, DESIGN_SYSTEM.md §21): every screen is a
 * plate in a guide to the learner's own study. Grove's colours and fonts,
 * a new presentation grammar. Build order: RunningHead, Plate (+ captions),
 * SpecimenLabel, ScaleBar, StemChart (+ StemList), Specimen, HerbariumSheet
 * (+ CollectRow), KeyList, EmptyPlate.
 */
export { FieldText } from './FieldText';
export { RunningHead, headDate, type HeadAction } from './RunningHead';
export { Plate, FigCaption, KeyCaption, figLine, figSpoken, type Fig } from './Plate';
export { SpecimenLabel, SpecimenRow } from './SpecimenLabel';
export { ScaleBar, scaleSpoken, ESTIMATE_WORDS } from './ScaleBar';
export { StemChart, StemList, stemWord, stemLines, MIN_COLUMN, type Stem } from './StemChart';
export { Specimen, SpecimenMount, TierLine, type SpecimenState } from './Specimen';
export { HerbariumSheet, CollectRow, sheetNo } from './HerbariumSheet';
export { KeyList, type KeyItem } from './KeyList';
export { EmptyPlate, EMPTY_PLATE_TITLE } from './EmptyPlate';

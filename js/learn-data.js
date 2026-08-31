/**
 * Ngân hàng dữ liệu UNITs bài học tương tác 5 kỹ năng Tiếng Anh & STEM
 * Interactive English & STEM Learning Hub - Units Data Bank
 */
import { unit_1 } from './data/units-en-grade10.js';
import { unit_2 } from './data/units-en-grade11.js';
import { unit_1787359536907 } from './data/units-en-grade12.js';
import { STEM_MATH_PHYS } from './data/units-stem-math-phys.js';
import { STEM_CS_CHEM } from './data/units-stem-cs-chem.js';

export const DEFAULT_UNITS = [
  unit_1,
  unit_2,
  unit_1787359536907,
  ...STEM_MATH_PHYS,
  ...STEM_CS_CHEM
];

export const LEARN_DATA = {
  units: DEFAULT_UNITS
};

export const SAMPLE_LEARN_UNITS = DEFAULT_UNITS;


import { unit12ReadingPassage } from './unit12-reading-passage.js';
import { unit12ReadingExPart1 } from './unit12-reading-ex1-4.js';
import { unit12ReadingExPart2 } from './unit12-reading-ex5-8.js';

export const unit12Reading = [
  {
    ...unit12ReadingPassage,
    exercises: [
      ...unit12ReadingExPart1,
      ...unit12ReadingExPart2
    ]
  }
];

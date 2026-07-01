# Draft Engine

This folder is the portable draft logic layer. Keep functions here independent from React, CSS, browser APIs, and Next.js.

Good candidates for this folder:

- draft order and pick state helpers
- player scoring and recommendation formulas
- CPU profile and pick behavior
- category need calculations
- projected standings math
- roster slot fitting
- draft capital calculations
- API data normalization

Migration notes for the future JavaScript codebase:

- The functions here should accept plain objects and return plain objects.
- Keep UI labels and styling outside the engine unless the label is part of the domain model.
- Prefer small named functions over component-local calculations.
- When converting to regular JavaScript, keep JSDoc comments for the expected shapes of players, picks, stats, and settings.

# ReadyToGym

A workout and nutrition tracker for Android and iOS, built with **Expo** (React Native) and
TypeScript. Everything is stored on the device in SQLite, so it works fully offline. The interface
is in Romanian.

## Features

**Workouts**

- Create routines from an exercise library, or add your own exercises
- Start a workout from a routine or an empty one, log sets with weight and reps
- Suggested values for each set, based on your previous session
- Rest clock that starts after each completed set
- Workout history, plus a per-exercise history with the heaviest weight of each session

**Nutrition**

- Log food from saved foods, create new foods, or use a quick add
- Daily calorie and macro targets with progress for the day

## Tech stack

- Expo SDK 58, Expo Router (file-based navigation in `src/app/`)
- `expo-sqlite` for local storage (`src/db/`)
- TypeScript, React 19, React Native 0.88

## Project structure

```
src/
├── app/
│   ├── (tabs)/      Workout, Nutrition, History, Exercises
│   ├── workout/     active workout and finished workout details
│   ├── routine/     create and edit routines
│   ├── exercise/    exercise details, new exercise, exercise picker
│   └── nutrition/   add food, food details, entries, targets
├── components/      shared UI
├── db/              schema and queries
├── hooks/
└── utils/
```

## Running

Requires Node.js.

```bash
npm install
npx expo start
```

Then open the app in Expo Go or a development build on your phone, or press `a` for an Android
emulator. Type check with `npm run typecheck`.

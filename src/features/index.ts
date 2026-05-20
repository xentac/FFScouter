import Attack from "./attack";
import Faction from "./faction";
import type { Feature } from "./feature";
import MiniProfile from "./mini-profile";
import Profile from "./profile";
import Settings from "./settings";

export const Features: Feature[] = [
  Settings,
  Profile,
  Attack,
  Faction,
  MiniProfile,
];

// You'll need to add a new export here for each feature
// It's a pain in the ass and I want something that's less annoying, but i doubt it's possible :p

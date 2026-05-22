import Attack from "./attack";
import Faction from "./faction";
import Fallback from "./fallback";
import type { Feature } from "./feature";
import FFButton from "./ff-button";
import MiniProfile from "./mini-profile";
import Profile from "./profile";
import ProfileFlights from "./profile-flights";
import ProfileHistory from "./profile-history";
import Settings from "./settings";

export const Features: Feature[] = [
  Settings,
  Profile,
  ProfileHistory,
  ProfileFlights,
  Attack,
  Faction,
  MiniProfile,
  FFButton,
  Fallback,
];

// You'll need to add a new export here for each feature
// It's a pain in the ass and I want something that's less annoying, but i doubt it's possible :p

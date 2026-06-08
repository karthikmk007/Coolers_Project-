/** Pure utility — safe to import in Server Components */

export interface CrowdNote {
  imageUrl:  string;
  label:     string;
  mentions:  number;
  category:  string;
}

export function notesFromFlavors(flavorNotes: string[]): CrowdNote[] {
  return flavorNotes.slice(0, 6).map((note, i) => ({
    imageUrl:  "",
    label:     note,
    mentions:  Math.floor(180 + i * 47 + note.length * 13),
    category:  "flavor note",
  }));
}

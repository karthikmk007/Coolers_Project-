import { redirect } from "next/navigation";

// The split-panel catalogue is the primary experience — redirect home to it.
export default function Home() {
  redirect("/browse");
}

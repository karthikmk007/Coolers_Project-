import { redirect } from "next/navigation";

// The CRACKED v3.0 app is the primary experience — land on its home feed.
export default function Home() {
  redirect("/home");
}

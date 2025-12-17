import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import OnlineUser from "./online-user";

export default function Header() {
  const isHome = useLocation().pathname === "/";
  return (
    <header className="border-b border-border z-10 bg-background">
      <div className="flex items-center justify-between px-6 py-4">
        {!isHome && (
          <Button variant="link" asChild>
            <Link to="/">
              <ArrowLeft className="size-4" />
              <span>BACK</span>
            </Link>
          </Button>
        )}
        <div className="grow" />
        <OnlineUser />
      </div>
    </header>
  );
}

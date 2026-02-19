"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Github, Linkedin, Mail, MapPin, Send } from "lucide-react"

function FooterSection() {
  return (
    <footer className="border-t border-border/60 bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Newsletter */}
          <div className="relative">
            <h2 className="mb-4 text-2xl font-bold tracking-tight">
              Stay Connected
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Join the newsletter for updates on Agentic Flow and new features.
            </p>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault()
                /* TODO: hook to newsletter */
              }}
            >
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-foreground text-background transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Quick Links
            </h3>
            <nav className="space-y-2.5 text-sm">
              <a
                href="/editor"
                className="block transition-colors hover:text-foreground text-muted-foreground"
              >
                Launch Canvas
              </a>
              <a
                href="#features"
                className="block transition-colors hover:text-foreground text-muted-foreground"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block transition-colors hover:text-foreground text-muted-foreground"
              >
                How It Works
              </a>
              <a
                href="https://github.com/RajanChavada/Agentic-flow"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-colors hover:text-foreground text-muted-foreground"
              >
                GitHub Repo
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Contact
            </h3>
            <address className="space-y-2.5 text-sm not-italic text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Toronto, Ontario, Canada
              </p>
              <a
                href="mailto:RajanChavada111@gmail.com"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                RajanChavada111@gmail.com
              </a>
            </address>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Connect
            </h3>
            <div className="flex gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      asChild
                    >
                      <a
                        href="https://github.com/rajanchavada/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                        <span className="sr-only">GitHub</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>GitHub</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      asChild
                    >
                      <a
                        href="https://www.linkedin.com/in/rajan-chavada/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Linkedin className="h-4 w-4" />
                        <span className="sr-only">LinkedIn</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      asChild
                    >
                      <a href="mailto:RajanChavada111@gmail.com">
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Email</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send an email</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <p className="mt-5 text-sm font-medium">Rajan Chavada</p>
            <p className="text-xs text-muted-foreground">
              Builder of Agentic Flow
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Agentic Flow · Rajan Chavada. All
            rights reserved.
          </p>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/RajanChavada/Agentic-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              Source Code
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { FooterSection }

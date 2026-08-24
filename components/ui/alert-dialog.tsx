"use client";

/**
 * AlertDialog — built on top of the existing Dialog (base-ui) primitives.
 * Matches the shadcn/ui AlertDialog API so existing imports work unchanged.
 */

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonProps = React.ComponentProps<typeof Button> & VariantProps<typeof buttonVariants>;
import { cn } from "@/lib/utils";

// Root — re-export Dialog as AlertDialog
const AlertDialog = Dialog;

// Trigger
const AlertDialogTrigger = DialogTrigger;

// Portal / Overlay
const AlertDialogPortal = DialogPortal;
const AlertDialogOverlay = DialogOverlay;

// Content — no auto close button (confirmations handle their own buttons)
function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn("sm:max-w-md", className)}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

// Header / Title / Description
const AlertDialogHeader = DialogHeader;
const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = DialogDescription;

// Footer
function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <DialogFooter
      showCloseButton={false}
      className={cn("sm:flex-row sm:justify-end gap-2", className)}
      {...props}
    />
  );
}

// Cancel — wraps DialogClose with outline button style
function AlertDialogCancel({
  className,
  children = "Cancel",
  ...props
}: Omit<ButtonProps, "variant">) {
  return (
    <DialogClose
      render={
        <Button
          variant="outline"
          className={cn("mt-2 sm:mt-0", className)}
          {...props}
        >
          {children}
        </Button>
      }
    />
  );
}

// Action — default destructive-safe action button (closes dialog on click)
function AlertDialogAction({
  className,
  children = "Continue",
  onClick,
  ...props
}: Omit<ButtonProps, "variant">) {
  return (
    <DialogClose
      render={
        <Button
          className={cn(
            "bg-[#2EBD6B] hover:bg-[#26a85d] text-white",
            className
          )}
          onClick={onClick}
          {...props}
        >
          {children}
        </Button>
      }
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
};

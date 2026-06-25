import * as React from "react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type AvatarColor = "gold" | "green"

type AvatarMember = {
  /** Full name, used to derive the initials and the title tooltip. */
  name: string
  /** Fallback color when there is no image. Defaults to "gold". */
  color?: AvatarColor
}

const COLOR_CLASSES: Record<AvatarColor, string> = {
  gold: "bg-gold-200 text-espresso-700",
  green: "bg-green-100 text-green-700",
}

/** Derives up to two uppercase initials from a name. */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

type AvatarGroupProps = React.ComponentProps<"div"> & {
  members: AvatarMember[]
}

function AvatarGroup({ className, members, ...props }: AvatarGroupProps) {
  return (
    <div
      data-slot="avatar-group"
      className={cn("flex -space-x-2", className)}
      {...props}
    >
      {members.map((member, index) => (
        <Avatar
          key={`${member.name}-${index}`}
          title={member.name}
          className="size-7 ring-2 ring-surface-card"
        >
          <AvatarFallback
            className={cn(
              "text-xs font-bold",
              COLOR_CLASSES[member.color ?? "gold"]
            )}
          >
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

export { AvatarGroup }
export type { AvatarGroupProps, AvatarMember, AvatarColor }

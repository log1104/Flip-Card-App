import type { ComponentPropsWithoutRef } from "react"

export type SkeletonProps = ComponentPropsWithoutRef<'div'> & {
  variant?: 'pill' | 'text' | 'card'
}

const skeletonVariants: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 rounded-full',
  pill: 'h-8 rounded-full',
  card: 'min-h-[6rem] rounded-2xl',
}

function cn(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[color:var(--color-border)]/40',
        skeletonVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

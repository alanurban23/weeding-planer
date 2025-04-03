import React, { useState, useRef, TouchEvent } from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface SwipeableItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void; // Callback for full left swipe action
  onSwipeRight?: () => void; // Callback for full right swipe action (optional)
  leftActions?: React.ReactNode; // Content revealed on right swipe (shows on left)
  rightActions?: React.ReactNode; // Content revealed on left swipe (shows on right)
  actionWidth?: number; // Width of the action area
  threshold?: number; // Swipe distance threshold to trigger action (fraction of actionWidth)
  blockSwipe?: boolean; // Prop to disable swiping
  className?: string;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActions,
  rightActions,
  actionWidth = 80, // Default width for action buttons area
  threshold = 0.5, // Default threshold
  blockSwipe = false, // Default blockSwipe to false
  className,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const swipeThreshold = actionWidth * threshold;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (blockSwipe) return; // Prevent swipe if blocked

    startX.current = e.touches[0].clientX;
    currentX.current = startX.current; // Initialize currentX
    setIsSwiping(true);
    // Disable transition during swipe for smooth movement
    if (itemRef.current) {
      itemRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isSwiping) return;

    currentX.current = e.touches[0].clientX;
    let diffX = currentX.current - startX.current;

    // Limit swipe distance to action areas
    if (diffX > 0 && leftActions) { // Swiping right
        diffX = Math.min(diffX, actionWidth);
    } else if (diffX < 0 && rightActions) { // Swiping left
        diffX = Math.max(diffX, -actionWidth);
    } else {
        // No actions in this direction, maybe allow small bounce? Or just clamp.
         diffX = 0;
    }

    setOffsetX(diffX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    // Re-enable transition for snap back or action reveal
    if (itemRef.current) {
      itemRef.current.style.transition = 'transform 0.3s ease';
    }

    if (offsetX > swipeThreshold && leftActions) {
      // Swiped right enough to potentially trigger action or stay open
      setOffsetX(actionWidth); // Keep left actions revealed
      // onSwipeRight?.(); // Optional: Trigger action on full swipe release
    } else if (offsetX < -swipeThreshold && rightActions) {
      // Swiped left enough to potentially trigger action or stay open
      setOffsetX(-actionWidth); // Keep right actions revealed
      // onSwipeLeft?.(); // Optional: Trigger action on full swipe release
    } else {
      // Didn't swipe far enough, snap back
      setOffsetX(0);
    }

    setIsSwiping(false);
    startX.current = 0;
    currentX.current = 0;
  };

  // Reset swipe if user clicks outside or on the item itself without swiping far enough
  const handleItemClick = () => {
    if (offsetX !== 0) {
        if (itemRef.current) {
            itemRef.current.style.transition = 'transform 0.3s ease';
        }
        setOffsetX(0);
    }
    // Note: We might need to prevent click propagation if the item itself has an onClick
  }

  return (
    <div className={cn("relative overflow-hidden w-full", className)} onClick={handleItemClick}>
      {/* Action container - Background */}
      <div className="absolute inset-y-0 left-0 right-0 flex justify-between">
        <div style={{ width: `${actionWidth}px` }} className="h-full flex items-center justify-start">
          {leftActions}
        </div>
        <div style={{ width: `${actionWidth * (rightActions ? 1 : 0)}px` }} className="h-full flex items-center justify-end">
           {/* We might need multiple buttons here, adjust styling */}
           {rightActions}
        </div>
      </div>

      {/* Main Content Item */}
      <div
        ref={itemRef}
        className="relative bg-background w-full" // Use theme background
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;

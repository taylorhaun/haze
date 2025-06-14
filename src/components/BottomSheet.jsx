import React, { useState, useEffect, useRef } from 'react';

export default function BottomSheet({ open, onClose, defaultHeight = 'half', children }) {
  const [height, setHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const sheetRef = useRef(null);

  // Set initial height based on defaultHeight prop
  useEffect(() => {
    if (!open) {
      setHeight(0);
      return;
    }
    if (defaultHeight === 'full') {
      setHeight(window.innerHeight * 0.9);
    } else if (defaultHeight === 'half') {
      setHeight(window.innerHeight * 0.5);
    } else if (typeof defaultHeight === 'number') {
      setHeight(defaultHeight);
    }
  }, [open, defaultHeight]);

  // Drag logic
  useEffect(() => {
    if (!isDragging) return;
    const handleDragMove = (e) => {
      const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      const deltaY = dragStartY.current - clientY;
      const newHeight = Math.max(200, Math.min(window.innerHeight * 0.9, dragStartHeight.current + deltaY));
      setHeight(newHeight);
    };
    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
      // Snap to full or half or close
      if (height < window.innerHeight * 0.3) {
        setHeight(0);
        if (onClose) setTimeout(onClose, 200);
      } else if (height > window.innerHeight * 0.7) {
        setHeight(window.innerHeight * 0.9);
      } else {
        setHeight(window.innerHeight * 0.5);
      }
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove);
    window.addEventListener('touchend', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, height, onClose]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStartY.current = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStartHeight.current = height;
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
  };

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setHeight(0);
      if (onClose) setTimeout(onClose, 200);
    }
  };

  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="bottom-sheet-overlay"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.25)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={handleOverlayClick}
    >
      <div
        ref={sheetRef}
        className="bottom-sheet"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${height}px`,
          background: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 1000,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '24px',
            background: 'transparent',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            zIndex: 10,
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '5px',
              background: '#cbd5e1',
              borderRadius: '3px',
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              touchAction: 'none',
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          />
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '100px' }}>
          {children}
        </div>
      </div>
    </div>
  );
} 
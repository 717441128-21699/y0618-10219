import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface SplitPaneProps {
  direction: 'horizontal' | 'vertical';
  initialSize: number;
  minSize: number;
  maxSize?: number;
  collapsed?: boolean;
  firstPane: React.ReactNode;
  secondPane: React.ReactNode;
  onSizeChange?: (size: number) => void;
  className?: string;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  direction, initialSize, minSize, maxSize, collapsed = false,
  firstPane, secondPane, onSizeChange, className = '',
}) => {
  const [size, setSize] = useState(initialSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    onSizeChange?.(collapsed ? 0 : size);
  }, [size, collapsed]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;
      if (direction === 'horizontal') {
        newSize = e.clientX - rect.left;
      } else {
        newSize = rect.bottom - e.clientY;
      }
      const clamped = Math.max(
        minSize,
        maxSize ? Math.min(maxSize, newSize) : newSize,
      );
      setSize(clamped);
    };
    const handleUp = () => { draggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    if (draggingRef.current) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  });

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const isHoriz = direction === 'horizontal';

  const firstStyle: React.CSSProperties = collapsed
    ? { [isHoriz ? 'width' : 'height']: 0, overflow: 'hidden' }
    : { [isHoriz ? 'width' : 'height']: size, flexShrink: 0, minWidth: 0, minHeight: 0 };

  const splitterStyle: React.CSSProperties = collapsed
    ? { display: 'none' }
    : {
      [isHoriz ? 'width' : 'height']: 5,
      cursor: isHoriz ? 'col-resize' : 'row-resize',
      position: 'relative',
      flexShrink: 0,
      zIndex: 50,
    };

  return (
    <div
      ref={containerRef}
      className={`flex ${isHoriz ? 'flex-row' : 'flex-col'} overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <div style={firstStyle} className="overflow-hidden">
        {firstPane}
      </div>
      <div
        onMouseDown={startDrag}
        className={`group bg-transparent transition-colors ${
          isHoriz ? 'hover:bg-cyan-500/40' : 'hover:bg-amber-500/40'
        }`}
        style={splitterStyle}
      >
        <div className={`absolute ${
          isHoriz
            ? 'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'
            : 'left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'
        } rounded-sm bg-slate-600/0 group-hover:bg-slate-500/60 transition-colors ${
          isHoriz ? 'w-[3px] h-10' : 'h-[3px] w-10'
        }`} />
      </div>
      <div className="flex-1 overflow-hidden min-w-0 min-h-0">
        {secondPane}
      </div>
    </div>
  );
};

interface CollapsiblePanelProps {
  collapsed: boolean;
  direction: 'left' | 'right' | 'bottom';
  width?: number;
  height?: number;
  toggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  collapsed, direction, width, height, toggle, children, className = '',
}) => {
  const collapseBtn = () => {
    const iconClass = 'h-3 w-3';
    let Icon = ChevronLeft;
    if (direction === 'left' && collapsed) Icon = ChevronRight;
    else if (direction === 'right' && collapsed) Icon = ChevronLeft;
    else if (direction === 'right') Icon = ChevronRight;
    else if (direction === 'bottom') Icon = ChevronDown;
    return (
      <button
        onClick={toggle}
        className={`absolute z-20 flex h-7 w-5 items-center justify-center rounded-md border border-[#2A3352] bg-[#0D1528] text-slate-400 transition-all hover:bg-[#1A2340] hover:text-white ${
          direction === 'left'
            ? 'right-[-10px] top-2'
            : direction === 'right'
            ? 'left-[-10px] top-2'
            : 'top-[-14px] left-1/2 -translate-x-1/2 rotate-180'
        }`}
        title={collapsed ? '展开' : '折叠'}
      >
        <Icon className={iconClass} />
      </button>
    );
  };

  if (collapsed) {
    return (
      <div
        className={`relative ${className}`}
        style={{ width: direction !== 'bottom' ? 0 : '100%', height: direction === 'bottom' ? 0 : '100%' }}
      >
        {collapseBtn()}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: direction !== 'bottom' ? (width ?? 'auto') : '100%',
        height: direction === 'bottom' ? (height ?? 'auto') : '100%',
        minWidth: direction !== 'bottom' ? 0 : undefined,
        minHeight: direction === 'bottom' ? 0 : undefined,
      }}
    >
      {collapseBtn()}
      <div className="h-full w-full overflow-auto">
        {children}
      </div>
    </div>
  );
};

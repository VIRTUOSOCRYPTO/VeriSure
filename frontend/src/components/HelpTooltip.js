import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

const HelpTooltip = ({ 
  title, 
  content, 
  position = 'top', 
  icon = true,
  children 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
  };

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors"
        aria-label="Show help"
        type="button"
      >
        {children || (
          icon && <HelpCircle className="w-5 h-5" />
        )}
      </button>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-80 ${positionClasses[position]} animate-in fade-in-0 zoom-in-95`}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-4">
            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-gray-800 transition-colors"
              aria-label="Close help"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            {title && (
              <h4 className="font-bold text-lg mb-2 pr-6">{title}</h4>
            )}

            {/* Content */}
            <div className="text-sm text-gray-200 space-y-2">
              {typeof content === 'string' ? (
                <p>{content}</p>
              ) : (
                content
              )}
            </div>

            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;

import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Drawer — slide-in side panel for detail-on-the-side views.
 */
const Drawer = ({ isOpen, onClose, title, children, side = 'right', width = 'md' }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const widthClass = { sm: 'w-80', md: 'w-96', lg: 'w-[32rem]', xl: 'w-[40rem]' }[width] || 'w-96';
  const positionClass = side === 'left' ? 'left-0' : 'right-0';
  const translateClass = isOpen
    ? 'translate-x-0'
    : side === 'left'
    ? '-translate-x-full'
    : 'translate-x-full';

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          absolute top-0 ${positionClass} h-full bg-white shadow-dropdown
          flex flex-col ${widthClass}
          transform transition-transform duration-300 ease-snappy ${translateClass}
        `}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <Button variant="ghost" size="sm" iconOnly icon={X} onClick={onClose} aria-label="Close" title="Close" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;

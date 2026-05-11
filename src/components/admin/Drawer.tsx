import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Drawer: React.FC<Props> = ({ open, onClose, title, sub, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer__scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <header className="drawer__head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="drawer__title">{title}</div>
            {sub && <div className="drawer__sub">{sub}</div>}
          </div>
          <button className="row-btn" onClick={onClose} title="Close (Esc)">
            <X size={14} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__foot">{footer}</footer>}
      </aside>
    </>
  );
};

export default Drawer;

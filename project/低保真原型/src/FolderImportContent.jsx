import React, {useEffect, useRef, useState} from 'react';

// Keep the original demo importer, with UI state isolated from other dialogs.
export default function FolderImportContent({render, active, onSaved, onManual}) {
  const [form, setForm] = useState({});
  const [importState, setImportState] = useState('idle');
  const [error, setError] = useState('');
  const timer = useRef(null), adopted = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!active) {
      clearTimeout(timer.current);
      setImportState(value => value === 'running' ? 'cancelled' : value);
      setForm(value => value.result ? {...value, result: false} : value);
    }
  }, [active]);
  const set = (key, value) => {
    if (key === 'file') adopted.current = false;
    setForm(previous => ({...previous, [key]: value}));
    setError('');
  };
  const status = value => {
    if (value === 'running' || value === 'ready') adopted.current = false;
    setImportState(value);
  };
  return <div className="folder-import-content">
    {error && <p className="error" role="alert">{error}</p>}
    {render({f: form, set, setForm, importState, setImportState: status, timer, fail: setError, onSaved, onManual,
      canAdopt: () => {if (adopted.current) return false; adopted.current = true; return true;}})}
  </div>;
}

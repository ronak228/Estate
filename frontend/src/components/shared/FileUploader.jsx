import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

/**
 * FileUploader — drag/drop or click file input with type/size validation.
 * Base component for DocumentUploader and company logo upload.
 */
const FileUploader = ({
  accept = '*',
  maxSizeMb = 5,
  onFileSelected,
  multiple = false,
  label = 'Click or drag & drop to upload',
  className = '',
}) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const validateAndSelect = (files) => {
    setError('');
    const fileArray = Array.from(files);
    const oversized = fileArray.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (oversized) {
      setError(`File too large. Maximum size is ${maxSizeMb} MB.`);
      return;
    }
    onFileSelected(multiple ? fileArray : fileArray[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndSelect(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-150 ease-snappy
          ${dragOver ? 'border-primary bg-primary-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
        `}
      >
        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-1">Max {maxSizeMb} MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => validateAndSelect(e.target.files)}
        />
      </div>
      {error && (
        <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
          <X size={12} /> {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;

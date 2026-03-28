import { UploadZone } from '@/components/upload/upload-zone';
import { UploadHistory } from '@/components/upload/upload-history';

export const metadata = {
  title: 'Upload Scan | CVERiskPilot',
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Scan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a vulnerability scan file to import findings and create cases.
        </p>
      </div>
      <UploadZone />
      <UploadHistory />
    </div>
  );
}

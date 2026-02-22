import { AlertTriangle, Phone, MessageSquare, X } from 'lucide-react';
import type { CrisisResources } from '../types';

interface CrisisModalProps {
  resources: CrisisResources;
  onDismiss: () => void;
}

export function CrisisModal({ resources, onDismiss }: CrisisModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-label="Crisis Resources">
      <div className="crisis-modal">
        <button className="modal-close" onClick={onDismiss} aria-label="Close">
          <X size={20} />
        </button>

        <div className="crisis-header">
          <AlertTriangle size={32} className="crisis-icon" />
          <h2>You Are Not Alone</h2>
          <p>
            It sounds like you may be going through a very difficult time.
            Please reach out to one of these resources — trained professionals
            are available 24/7 to help.
          </p>
        </div>

        <div className="crisis-resources">
          <a href={`tel:${resources.emergency}`} className="crisis-resource emergency">
            <Phone size={24} />
            <div>
              <strong>Emergency Services</strong>
              <span>Call {resources.emergency}</span>
            </div>
          </a>

          <a href="tel:18002333330" className="crisis-resource">
            <Phone size={24} />
            <div>
              <strong>Vandrevala Foundation</strong>
              <span>{resources.suicidePrevention}</span>
            </div>
          </a>

          <a href="tel:9152987821" className="crisis-resource">
            <MessageSquare size={24} />
            <div>
              <strong>iCALL (TISS)</strong>
              <span>{resources.crisisText}</span>
            </div>
          </a>

          <a href="tel:9820466726" className="crisis-resource">
            <Phone size={24} />
            <div>
              <strong>AASRA</strong>
              <span>{resources.international}</span>
            </div>
          </a>
        </div>

        <p className="crisis-reminder">
          Your safety is the top priority. Please reach out to a professional.
        </p>
      </div>
    </div>
  );
}

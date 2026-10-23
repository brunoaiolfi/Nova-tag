import type {CaptureOwner} from '../../domain/offline/owner';

export interface CaptureContext extends CaptureOwner {
  canCapture: boolean;
  canSend: boolean;
}

import type {AdminOwner} from '../../domain/administration/owner';

export interface AdminContext extends AdminOwner {
  station: string;
  sessionMarker: string;
}

import { IBaseService } from '../../infra/services/base/interfaces';
import { IBaseApplication } from './interface';

export class BaseApplication implements IBaseApplication {
    constructor(private readonly _baseService: IBaseService) { }
}

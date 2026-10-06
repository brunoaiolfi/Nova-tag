import type {IBaseApplication, IBaseService} from './interface';

export class BaseApplication implements IBaseApplication {
  constructor(private readonly _baseService: IBaseService) {}
}

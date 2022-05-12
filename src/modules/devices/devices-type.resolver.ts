import { Inject, OnModuleInit } from '@nestjs/common';
import { Parent, ResolveField, Resolver, Args } from '@nestjs/graphql';
import { ClientGrpcProxy } from '@nestjs/microservices';

import { PinoLogger } from 'nestjs-pino';

import { QueryUtils } from '../../utils/query.utils';
import { IUsersService } from '../users/users.interface';
import { ISchedulesService } from '../schedules/schedules.interface';
import { SchedulesConnection, User } from '../../graphql.schema';
import { lastValueFrom } from 'rxjs';
import { DeviceDto } from './device.dto';
import { isEmpty, merge } from 'lodash';

@Resolver('Device')
export class DevicesTypeResolver implements OnModuleInit {
	constructor(
		@Inject('UsersServiceClient')
		private readonly usersServiceClient: ClientGrpcProxy,
		@Inject('SchedulesServiceClient')
		private readonly schedulesServiceClient: ClientGrpcProxy,
		private readonly queryUtils: QueryUtils,
		private readonly logger: PinoLogger,
	) {
		logger.setContext(DevicesTypeResolver.name);
	}

	private usersService: IUsersService;
	private schedulesService: ISchedulesService;

	onModuleInit(): void {
		this.usersService =
			this.usersServiceClient.getService<IUsersService>('UsersService');
		this.schedulesService =
			this.schedulesServiceClient.getService<ISchedulesService>(
				'SchedulesService',
			);
	}

	@ResolveField('user')
	async getUser(@Parent() device: DeviceDto): Promise<User> {
		return lastValueFrom(
			this.usersService.findById({
				id: device.user,
			}),
		);
	}

	@ResolveField('schedules')
	async getSchedules(
		@Parent() device: DeviceDto,
		@Args('q') q: string,
		@Args('first') first: number,
		@Args('last') last: number,
		@Args('before') before: string,
		@Args('after') after: string,
		@Args('filterBy') filterBy: any,
		@Args('orderBy') orderBy: string,
	): Promise<SchedulesConnection> {
		const query = { where: { device: device.id } };

		if (!isEmpty(q)) merge(query, { where: { text: { _iLike: q } } });

		merge(
			query,
			await this.queryUtils.buildQuery(
				filterBy,
				orderBy,
				first,
				last,
				before,
				after,
			),
		);

		return lastValueFrom(
			this.schedulesService.find({
				...query,
				where: JSON.stringify(query.where),
			}),
		);
	}
}

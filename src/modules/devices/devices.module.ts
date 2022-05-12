import { join } from 'path';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import {
	ClientProxyFactory,
	Transport,
	ClientGrpcProxy,
} from '@nestjs/microservices';
import { PubSub } from 'graphql-subscriptions';

import { DevicesTypeResolver } from './devices-type.resolver';
import { DevicesQueryResolver } from './devices-query.resolver';
import { DevicesMutationResolver } from './devices-mutation.resolver';
import { DevicesSubscriptionResolver } from './devices-subscription.resolver';

import { UtilsModule } from '../../utils/utils.module';
import { UsersModule } from '../users/users.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
	imports: [
		ConfigModule,
		LoggerModule,
		UtilsModule,
		forwardRef(() => UsersModule),
		forwardRef(() => SchedulesModule),
	],
	providers: [
		DevicesTypeResolver,
		DevicesQueryResolver,
		DevicesMutationResolver,
		DevicesSubscriptionResolver,
		{
			provide: 'DevicesServiceClient',
			useFactory: (configService: ConfigService): ClientGrpcProxy => {
				return ClientProxyFactory.create({
					transport: Transport.GRPC,
					options: {
						url: configService.get<string>('ALMOND_DEVICE_URL'),
						package: 'device',
						protoPath: join(__dirname, '../../_proto/device.proto'),
						loader: {
							keepCase: true,
							enums: String,
							oneofs: true,
							arrays: true,
						},
					},
				});
			},
			inject: [ConfigService],
		},
		{
			provide: 'PUB_SUB',
			useValue: new PubSub(),
		},
	],
	exports: ['DevicesServiceClient'],
})
export class DevicesModule {}

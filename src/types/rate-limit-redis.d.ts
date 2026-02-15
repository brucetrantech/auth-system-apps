declare module 'rate-limit-redis' {
	import { Store } from 'express-rate-limit';
	import { Redis, Cluster } from 'ioredis';

	interface RedisStoreOptions {
		client: Redis | Cluster;
		prefix?: string;
		sendCommand?: (...args: any[]) => Promise<any>;
		resetExpiryOnChange?: boolean;
	}

	class RedisStore implements Store {
		constructor(options: RedisStoreOptions);
		increment(key: string): Promise<{ totalHits: number; resetTime?: Date }>;
		decrement(key: string): Promise<void>;
		resetKey(key: string): Promise<void>;
	}

	export = RedisStore;
}

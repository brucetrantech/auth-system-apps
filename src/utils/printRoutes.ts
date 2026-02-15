import { Application } from 'express';
import { logger } from './logger';

/**
 * Print all registered routes in the Express application
 */
export const printRoutes = (app: Application): void => {
	const routes: Array<{ method: string; path: string }> = [];

	function print(path: any, layer: any) {
		if (layer.route) {
			layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))));
		} else if (layer.name === 'router' && layer.handle.stack) {
			layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))));
		} else if (layer.method) {
			const method = layer.method.toUpperCase();
			const currentPath = path.concat(split(layer.regexp)).filter(Boolean).join('/');
			routes.push({ method, path: '/' + currentPath });
		}
	}

	function split(thing: any) {
		if (typeof thing === 'string') {
			return thing.split('/');
		} else if (thing.fast_slash) {
			return '';
		} else {
			const match = thing
				.toString()
				.replace('\\/?', '')
				.replace('(?=\\/|$)', '$')
				.match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
			return match
				? match[1].replace(/\\(.)/g, '$1').split('/')
				: '<complex:' + thing.toString() + '>';
		}
	}

	// @ts-ignore
	if (app._router && app._router.stack) {
		// @ts-ignore
		app._router.stack.forEach(print.bind(null, []));
	}

	// Deduplicate routes
	const uniqueRoutesMap = new Map<string, { method: string; path: string }>();
	routes.forEach((r) => {
		// Clean path first
		let cleanPath = '/' + r.path.replace(/\/+/g, '/').replace(/\\/g, '').replace(/^\//, '');
		// handle empty path
		if (cleanPath === '/') cleanPath = '/';

		const key = `${r.method}:${cleanPath}`;
		if (!uniqueRoutesMap.has(key)) {
			uniqueRoutesMap.set(key, { method: r.method, path: cleanPath });
		}
	});

	const uniqueRoutes = Array.from(uniqueRoutesMap.values());

	if (uniqueRoutes.length > 0) {
		logger.info('');
		logger.info('📚 Registered API Routes:');
		logger.info(
			'╔══════════════════════════════════════════════════════════════════════════════╗',
		);

		// Sort routes by path then method
		uniqueRoutes.sort((a, b) => {
			if (a.path === b.path) {
				return a.method.localeCompare(b.method);
			}
			return a.path.localeCompare(b.path);
		});

		uniqueRoutes.forEach(({ method, path }) => {
			// Filter out internal/excessive routes if needed
			if (path === '/query') return;

			let color = '';
			const reset = '\x1b[0m';

			switch (method) {
				case 'GET':
					color = '\x1b[32m';
					break; // Green
				case 'POST':
					color = '\x1b[33m';
					break; // Yellow
				case 'PUT':
					color = '\x1b[34m';
					break; // Blue
				case 'DELETE':
					color = '\x1b[31m';
					break; // Red
				case 'PATCH':
					color = '\x1b[35m';
					break; // Magenta
				default:
					color = '\x1b[37m';
					break; // White
			}

			const methodStr = `${color}${method.padEnd(7)}${reset}`;

			logger.info(`║ ${methodStr} ${path.padEnd(68)} ║`);
		});
		logger.info(
			'╚══════════════════════════════════════════════════════════════════════════════╝',
		);
		logger.info('');
	}
};

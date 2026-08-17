import {describe, test, expect} from 'vitest';
import {RasterDEMTileWorkerSource} from './raster_dem_tile_worker_source.ts';
import {DEMData} from '../data/dem_data.ts';
import {AJAXError} from '../util/ajax.ts';
import {type WorkerDEMTileParameters} from './worker_source.ts';

describe('loadTile', () => {
    test('loads DEM tile', async () => {
        const source = new RasterDEMTileWorkerSource();

        const data = await source.loadTile({
            source: 'source',
            uid: '0',
            rawImageData: {data: new Uint8ClampedArray(256), height: 8, width: 8},
            dim: 256
        } as any as WorkerDEMTileParameters);
        expect(Object.keys(source.loaded)).toEqual(['0']);
        expect(data).toBeInstanceOf(DEMData);
    });

    test('rejects a 1x1 tile, as decoded from an empty (204) response, instead of loading it as DEM', async () => {
        const source = new RasterDEMTileWorkerSource();

        const promise = source.loadTile({
            source: 'source',
            uid: '0',
            rawImageData: {data: new Uint8ClampedArray(4), height: 1, width: 1},
            dim: 256
        } as any as WorkerDEMTileParameters);

        await expect(promise).rejects.toThrow(AJAXError);
        await expect(promise).rejects.toMatchObject({status: 404});
        expect(source.loaded).toEqual({});
    });
});

describe('removeTile', () => {
    test('removes loaded tile', () => {
        const source = new RasterDEMTileWorkerSource();

        source.loaded = {
            '0': {} as DEMData
        };

        source.removeTile({
            source: 'source',
            uid: '0',
            type: 'raster-dem',
        });

        expect(source.loaded).toEqual({});
    });
});

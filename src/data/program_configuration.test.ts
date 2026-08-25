import {describe, test, expect} from 'vitest';
import {ProgramConfiguration} from './program_configuration.ts';
import {FillExtrusionStyleLayer} from '../style/style_layer/fill_extrusion_style_layer.ts';
import {EvaluationParameters} from '../style/evaluation_parameters.ts';
import type {Uniform} from '../webgl/uniform_binding.ts';

function heightFactorAt(stops: [number, number], tileZoom: number, currentZoom: number): number {
    const layer = new FillExtrusionStyleLayer({
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'source',
        paint: {
            'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                stops[0], 0,
                stops[1], ['get', 'height']
            ]
        }
    } as any, {});
    layer.recalculate(new EvaluationParameters(tileZoom), []);

    const configuration = new ProgramConfiguration(layer, tileZoom, () => true);
    const binder = (configuration as any).binders['fill-extrusion-height'];
    let factor: number;
    binder.setUniform({set: (v: number) => { factor = v; }} as any as Uniform<number>, {zoom: currentZoom} as any);
    return factor;
}

describe('zoom-dependent paint properties on fractional zoom stops', () => {
    test('a ramp between two integer zooms is unchanged', () => {
        expect(heightFactorAt([15, 16], 15, 15)).toBeCloseTo(0, 5);
        expect(heightFactorAt([15, 16], 15, 15.5)).toBeCloseTo(0.5, 5);
        expect(heightFactorAt([15, 16], 15, 16)).toBeCloseTo(1, 5);
    });

    test('a ramp that ends within the zoom level completes at its own last stop', () => {
        expect(heightFactorAt([15, 15.1], 15, 15)).toBeCloseTo(0, 5);
        expect(heightFactorAt([15, 15.1], 15, 15.05)).toBeCloseTo(0.5, 5);
        expect(heightFactorAt([15, 15.1], 15, 15.1)).toBeCloseTo(1, 5);
        expect(heightFactorAt([15, 15.1], 15, 15.5)).toBeCloseTo(1, 5);
    });
});

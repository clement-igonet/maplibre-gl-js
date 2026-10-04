import {StencilMode} from '../stencil_mode.ts';
import {DepthMode} from '../depth_mode.ts';
import {terrainUniformValues, terrainDepthUniformValues} from '../program/terrain_program.ts';
import {CullFaceMode} from '../cull_face_mode.ts';
import {Color} from '@maplibre/maplibre-gl-style-spec';
import {ColorMode} from '../color_mode.ts';

import type {FrameRenderContext} from '../../render/frame_render_context.ts';
import type {Terrain} from '../../render/terrain.ts';
import type {Tile} from '../../tile/tile.ts';
import type {Painter} from '../../render/painter.ts';

/**
 * Redraw the Depth Framebuffer
 * @param painter - the painter
 * @param terrain - the terrain
 */
function drawDepth(painter: Painter, terrain: Terrain): void {
    const context = painter.context;
    const gl = context.gl;
    const tr = painter.frameRenderContext.transform;
    const colorMode = ColorMode.unblended;
    const depthMode = new DepthMode(gl.LEQUAL, DepthMode.ReadWrite, [0, 1]);
    const tiles = terrain.tileManager.getRenderableTiles();
    const program = painter.frameRenderContext.useProgram('terrainDepth');
    context.bindFramebuffer.set(terrain.getFramebuffer().framebuffer);
    context.viewport.set([0, 0, painter.width  / devicePixelRatio, painter.height / devicePixelRatio]);
    context.clear({color: Color.white, depth: 1});
    for (const tile of tiles) {
        const mesh = terrain.getTerrainMesh(tile.tileID);
        const terrainData = terrain.getTerrainData(tile.tileID);
        const projectionData = tr.getProjectionData({overscaledTileID: tile.tileID, applyTerrainMatrix: false, applyGlobeMatrix: true});
        const uniformValues = terrainDepthUniformValues(terrain.getSkirtLength(tr.zoom));
        program.draw(context, gl.TRIANGLES, depthMode, StencilMode.disabled, colorMode, CullFaceMode.backCCW, uniformValues, terrainData, projectionData, 'terrain', mesh.vertexBuffer, mesh.indexBuffer, mesh.segments);
    }
    context.bindFramebuffer.set(null);
    context.viewport.set([0, 0, painter.width, painter.height]);
}

/**
 * Draws the terrain mesh with the render-to-texture result of each tile. With `behind3DLayer` the stack being
 * drawn follows a 3D layer in the style: the depth buffer is first reset to the terrain surface, so that the
 * 3D layer no longer hides what the style places above it, as it would not without terrain.
 */
function drawTerrain(painter: Painter, terrain: Terrain, tiles: Tile[], frameRenderContext: FrameRenderContext, behind3DLayer: boolean = false): void {
    const {isRenderingGlobe} = frameRenderContext.data;
    const context = painter.context;
    const gl = context.gl;
    const tr = frameRenderContext.transform;
    const colorMode = frameRenderContext.colorModeForRenderPass();
    const depthMode = frameRenderContext.getDepthModeFor3D();
    const program = frameRenderContext.useProgram('terrain');

    context.bindFramebuffer.set(null);
    context.viewport.set([0, 0, painter.width, painter.height]);

    const passes: Array<[Readonly<DepthMode>, Readonly<ColorMode>]> = behind3DLayer ?
        [[new DepthMode(gl.ALWAYS, DepthMode.ReadWrite, depthMode.range), ColorMode.disabled], [depthMode, colorMode]] :
        [[depthMode, colorMode]];

    for (const [passDepthMode, passColorMode] of passes) for (const tile of tiles) {
        const mesh = terrain.getTerrainMesh(tile.tileID);
        const texture = painter.renderToTexture.getTexture(tile);
        const terrainData = terrain.getTerrainData(tile.tileID);
        context.activeTexture.set(gl.TEXTURE0);
        texture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE, gl.LINEAR_MIPMAP_LINEAR);
        const eleDelta = terrain.getSkirtLength(tr.zoom);
        const fogMatrix = tr.calculateFogMatrix(tile.tileID.toUnwrapped());
        const uniformValues = terrainUniformValues(eleDelta, fogMatrix, frameRenderContext.data.sky, tr.pitch, isRenderingGlobe);
        const projectionData = frameRenderContext.getProjectionDataForTile(tile.tileID, {applyTerrainMatrix: false});
        program.draw(context, gl.TRIANGLES, passDepthMode, StencilMode.disabled, passColorMode, CullFaceMode.backCCW, uniformValues, terrainData, projectionData, 'terrain', mesh.vertexBuffer, mesh.indexBuffer, mesh.segments);
    }
}

export {
    drawTerrain,
    drawDepth
};

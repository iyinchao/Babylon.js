/// <reference path="../../../dist/preview release/babylon.d.ts"/>import { RawTexture } from "babylonjs";import { Tools } from "babylonjs";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BABYLON;
(function (BABYLON) {
    var NutSimpleMaterialDefines = /** @class */ (function (_super) {
        __extends(NutSimpleMaterialDefines, _super);
        function NutSimpleMaterialDefines() {
            var _this = _super.call(this) || this;
            _this.DIFFUSE = false;
            _this.CLIPPLANE = false;
            _this.ALPHATEST = false;
            _this.DEPTHPREPASS = false;
            _this.POINTSIZE = false;
            _this.FOG = false;
            _this.NORMAL = false;
            _this.UV1 = false;
            _this.UV2 = false;
            _this.VERTEXCOLOR = false;
            _this.VERTEXALPHA = false;
            _this.NUM_BONE_INFLUENCERS = 0;
            _this.BonesPerMesh = 0;
            _this.INSTANCES = false;
            _this.USE_BONE_TEXTURE = false;
            _this.SUPPORT_FLOAT_TEXTURE = false;
            _this.rebuild();
            return _this;
        }
        return NutSimpleMaterialDefines;
    }(BABYLON.MaterialDefines));
    var NutSimpleMaterial = /** @class */ (function (_super) {
        __extends(NutSimpleMaterial, _super);
        function NutSimpleMaterial(name, scene) {
            var _this = _super.call(this, name, scene) || this;
            _this.diffuseColor = new BABYLON.Color3(1, 1, 1);
            _this._disableLighting = false;
            _this._maxSimultaneousLights = 4;
            return _this;
        }
        NutSimpleMaterial.prototype.needAlphaBlending = function () {
            return (this.alpha < 1.0);
        };
        NutSimpleMaterial.prototype.needAlphaTesting = function () {
            return false;
        };
        NutSimpleMaterial.prototype.getAlphaTestTexture = function () {
            return null;
        };
        // Methods   
        NutSimpleMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }
            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new NutSimpleMaterialDefines();
            }
            var defines = subMesh._materialDefines;
            var scene = this.getScene();
            if (!this.checkReadyOnEveryCall && subMesh.effect) {
                if (this._renderId === scene.getRenderId()) {
                    return true;
                }
            }
            var engine = scene.getEngine();
            var caps = engine.getCaps();
            // Textures
            if (defines._areTexturesDirty) {
                defines._needUVs = false;
                if (scene.texturesEnabled) {
                    if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                        if (!this._diffuseTexture.isReady()) {
                            return false;
                        }
                        else {
                            defines._needUVs = true;
                            defines.DIFFUSE = true;
                        }
                    }
                }
            }
            // Misc.
            BABYLON.MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, defines);
            // Lights
            defines._needNormals = BABYLON.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);
            // Values that need to be evaluated on every frame
            BABYLON.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            // Attribs
            // NOTE: 4th argument turned off, do not use default bone implementation.
            BABYLON.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, false);
            if (mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
                defines["NUM_BONE_INFLUENCERS"] = mesh.numBoneInfluencers;
                defines["BonesPerMesh"] = (mesh.skeleton.bones.length + 1);
                defines["USE_BONE_TEXTURE"] = true;
            }
            if (caps.textureFloat) {
                defines["SUPPORT_FLOAT_TEXTURE"] = true;
            }
            // Get correct effect      
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();
                // Fallbacks
                var fallbacks = new BABYLON.EffectFallbacks();
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }
                BABYLON.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }
                //Attributes
                var attribs = [BABYLON.VertexBuffer.PositionKind];
                if (defines.NORMAL) {
                    attribs.push(BABYLON.VertexBuffer.NormalKind);
                }
                if (defines.UV1) {
                    attribs.push(BABYLON.VertexBuffer.UVKind);
                }
                if (defines.UV2) {
                    attribs.push(BABYLON.VertexBuffer.UV2Kind);
                }
                if (defines.VERTEXCOLOR) {
                    attribs.push(BABYLON.VertexBuffer.ColorKind);
                }
                // NOTE: 
                BABYLON.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
                BABYLON.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
                var shaderName = (engine.webGLVersion > 1) ? 'nutSimple300' : 'nutSimple100';
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                    "vFogInfos", "vFogColor", "pointSize",
                    "vDiffuseInfos",
                    "vClipPlane", "diffuseMatrix"
                ];
                var samplers = ["diffuseSampler"];
                var uniformBuffers = new Array();
                if (mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
                    samplers.push("boneSampler");
                    if (engine.webGLVersion === 1) {
                        uniforms.push("boneSamplerSize");
                    }
                }
                BABYLON.MaterialHelper.PrepareUniformsAndSamplersList({
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: defines,
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                    attributes: attribs,
                    uniformsNames: uniforms,
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers,
                    defines: join,
                    fallbacks: fallbacks,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights - 1 }
                }, engine), defines);
            }
            if (!subMesh.effect || !subMesh.effect.isReady()) {
                return false;
            }
            this._renderId = scene.getRenderId();
            this._wasPreviouslyReady = true;
            return true;
        };
        NutSimpleMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
            var scene = this.getScene();
            var engine = scene.getEngine();
            var defines = subMesh._materialDefines;
            if (!defines) {
                return;
            }
            var effect = subMesh.effect;
            if (!effect) {
                return;
            }
            this._activeEffect = effect;
            // Matrices
            this.bindOnlyWorldMatrix(world);
            this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
            // Bones
            // NOTE: Set matrix here
            if (mesh && mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
                var matrices = mesh.skeleton.getTransformMatrices(mesh);
                var size = 0;
                if (defines["SUPPORT_FLOAT_TEXTURE"]) {
                    var size = BABYLON.Tools.CeilingPOT(Math.ceil(Math.sqrt(matrices.length / 16 * 4)));
                    var boneTextureData = new Float32Array(new ArrayBuffer(size * size * 4 * 4));
                    boneTextureData.set(matrices);
                    if (!this._boneTexture) {
                        this._boneTexture = BABYLON.RawTexture.CreateRGBATexture(boneTextureData, size, size, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE, BABYLON.Engine.TEXTURETYPE_FLOAT);
                    }
                    else {
                        this._boneTexture.update(boneTextureData);
                    }
                }
                else {
                    // Convert to 1 float32 to 2 RBGA values
                    var size = BABYLON.Tools.CeilingPOT(Math.ceil(Math.sqrt(matrices.length * 2)));
                    var boneTextureData = new Uint8Array(new ArrayBuffer(size * size * 4));
                    BABYLON.Tools.ConvertMatricesToRGBA8(matrices, boneTextureData, matrices.length / (4 * 4));
                    if (!this._boneTexture) {
                        this._boneTexture = BABYLON.RawTexture.CreateRGBATexture(boneTextureData, size, size, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE, BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT);
                    }
                    else {
                        this._boneTexture.update(boneTextureData);
                    }
                }
                if (engine.webGLVersion === 1) {
                    this._activeEffect.setInt("boneSamplerSize", size);
                }
                this._activeEffect.setTexture("boneSampler", this._boneTexture);
            }
            if (this._mustRebind(scene, effect)) {
                // Textures        
                if (this._diffuseTexture && BABYLON.StandardMaterial.DiffuseTextureEnabled) {
                    this._activeEffect.setTexture("diffuseSampler", this._diffuseTexture);
                    this._activeEffect.setFloat2("vDiffuseInfos", this._diffuseTexture.coordinatesIndex, this._diffuseTexture.level);
                    this._activeEffect.setMatrix("diffuseMatrix", this._diffuseTexture.getTextureMatrix());
                }
                // Clip plane
                BABYLON.MaterialHelper.BindClipPlane(this._activeEffect, scene);
                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }
                BABYLON.MaterialHelper.BindEyePosition(effect, scene);
            }
            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
            // Lights
            if (scene.lightsEnabled && !this.disableLighting) {
                BABYLON.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
            }
            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }
            // Fog
            BABYLON.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
            this._afterBind(mesh, this._activeEffect);
        };
        NutSimpleMaterial.prototype.getAnimatables = function () {
            var results = [];
            if (this._diffuseTexture && this._diffuseTexture.animations && this._diffuseTexture.animations.length > 0) {
                results.push(this._diffuseTexture);
            }
            return results;
        };
        NutSimpleMaterial.prototype.getActiveTextures = function () {
            var activeTextures = _super.prototype.getActiveTextures.call(this);
            if (this._diffuseTexture) {
                activeTextures.push(this._diffuseTexture);
            }
            return activeTextures;
        };
        NutSimpleMaterial.prototype.hasTexture = function (texture) {
            if (_super.prototype.hasTexture.call(this, texture)) {
                return true;
            }
            if (this.diffuseTexture === texture) {
                return true;
            }
            return false;
        };
        NutSimpleMaterial.prototype.dispose = function (forceDisposeEffect) {
            if (this._diffuseTexture) {
                this._diffuseTexture.dispose();
            }
            if (this._boneTexture) {
                this._boneTexture.dispose();
            }
            _super.prototype.dispose.call(this, forceDisposeEffect);
        };
        NutSimpleMaterial.prototype.clone = function (name) {
            var _this = this;
            return BABYLON.SerializationHelper.Clone(function () { return new NutSimpleMaterial(name, _this.getScene()); }, this);
        };
        NutSimpleMaterial.prototype.serialize = function () {
            var serializationObject = BABYLON.SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.NutSimpleMaterial";
            return serializationObject;
        };
        NutSimpleMaterial.prototype.getClassName = function () {
            return "NutSimpleMaterial";
        };
        // Statics
        NutSimpleMaterial.Parse = function (source, scene, rootUrl) {
            return BABYLON.SerializationHelper.Parse(function () { return new NutSimpleMaterial(source.name, scene); }, source, scene, rootUrl);
        };
        __decorate([
            BABYLON.serializeAsTexture("diffuseTexture")
        ], NutSimpleMaterial.prototype, "_diffuseTexture", void 0);
        __decorate([
            BABYLON.serializeAsTexture("boneTexture")
        ], NutSimpleMaterial.prototype, "_boneTexture", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsTexturesDirty")
        ], NutSimpleMaterial.prototype, "diffuseTexture", void 0);
        __decorate([
            BABYLON.serializeAsColor3("diffuse")
        ], NutSimpleMaterial.prototype, "diffuseColor", void 0);
        __decorate([
            BABYLON.serialize("disableLighting")
        ], NutSimpleMaterial.prototype, "_disableLighting", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], NutSimpleMaterial.prototype, "disableLighting", void 0);
        __decorate([
            BABYLON.serialize("maxSimultaneousLights")
        ], NutSimpleMaterial.prototype, "_maxSimultaneousLights", void 0);
        __decorate([
            BABYLON.expandToProperty("_markAllSubMeshesAsLightsDirty")
        ], NutSimpleMaterial.prototype, "maxSimultaneousLights", void 0);
        return NutSimpleMaterial;
    }(BABYLON.PushMaterial));
    BABYLON.NutSimpleMaterial = NutSimpleMaterial;
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.nutSimpleMaterial.js.map

BABYLON.Effect.ShadersStore['nutSimple100VertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n\n#if NUM_BONE_INFLUENCERS>0\nattribute vec4 matricesIndices;\nattribute vec4 matricesWeights;\n#if NUM_BONE_INFLUENCERS>4\nattribute vec4 matricesIndicesExtra;\nattribute vec4 matricesWeightsExtra;\n#endif\n#ifdef USE_BONE_TEXTURE\nuniform sampler2D boneSampler;\nuniform int boneSamplerSize;\n#ifdef SUPPORT_FLOAT_TEXTURE\nmat4 getBoneMatrix(const in float i)\n{\nfloat j=i*4.0;\nfloat x=mod(j,float(boneSamplerSize));\nfloat y=floor(j/float(boneSamplerSize));\nfloat dx=1.0/float(boneSamplerSize);\nfloat dy=1.0/float(boneSamplerSize);\ny=dy*(y+0.5);\nvec4 v1=texture2D(boneSampler,vec2(dx*(x+0.5),y));\nvec4 v2=texture2D(boneSampler,vec2(dx*(x+1.5),y));\nvec4 v3=texture2D(boneSampler,vec2(dx*(x+2.5),y));\nvec4 v4=texture2D(boneSampler,vec2(dx*(x+3.5),y));\nmat4 bone=mat4(v1,v2,v3,v4);\nreturn bone;\n}\n#else\nfloat decodeRGBA2Float (float dx,float X,float Y,float index) {\nfloat i0=index*2.0+0.5;\nfloat i1=index*2.0+1.5;\n\nvec4 rgba0=texture2D(boneSampler,vec2(dx*(X+i0),Y));\nvec4 rgba1=texture2D(boneSampler,vec2(dx*(X+i1),Y));\nfloat frac_=dot(rgba0,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/160581375.0));\nfloat decimal_=floor(rgba1.r*255.0+0.5)+floor(rgba1.g*255.0+0.5)*255.0+floor(rgba1.b*255.0+0.5)*65025.0;\nfloat f=(decimal_+frac_)*(rgba1.a*2.0-1.0);\nreturn f;\n}\nmat4 getBoneMatrix(const in float i) {\nfloat j=i*32.0;\nfloat x=mod(j,float(boneSamplerSize));\nfloat y=floor(j/float(boneSamplerSize));\nfloat dx=1.0/float(boneSamplerSize);\nfloat dy=1.0/float(boneSamplerSize);\ny=dy*(y+0.5);\nfloat f00=decodeRGBA2Float(dx,x,y,0.0);\nfloat f01=decodeRGBA2Float(dx,x,y,1.0);\nfloat f02=decodeRGBA2Float(dx,x,y,2.0);\nfloat f03=decodeRGBA2Float(dx,x,y,3.0);\nfloat f10=decodeRGBA2Float(dx,x,y,4.0);\nfloat f11=decodeRGBA2Float(dx,x,y,5.0);\nfloat f12=decodeRGBA2Float(dx,x,y,6.0);\nfloat f13=decodeRGBA2Float(dx,x,y,7.0);\nfloat f20=decodeRGBA2Float(dx,x,y,8.0);\nfloat f21=decodeRGBA2Float(dx,x,y,9.0);\nfloat f22=decodeRGBA2Float(dx,x,y,10.0);\nfloat f23=decodeRGBA2Float(dx,x,y,11.0);\nfloat f30=decodeRGBA2Float(dx,x,y,12.0);\nfloat f31=decodeRGBA2Float(dx,x,y,13.0);\nfloat f32=decodeRGBA2Float(dx,x,y,14.0);\nfloat f33=decodeRGBA2Float(dx,x,y,15.0);\nmat4 bone=mat4( vec4(f00,f01,f02,f03),\nvec4(f10,f11,f12,f13),\nvec4(f20,f21,f22,f23),\nvec4(f30,f31,f32,f33));\nreturn bone;\n}\n#endif\n#endif\n#endif\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#ifdef USE_BONE_TEXTURE\n#if NUM_BONE_INFLUENCERS>0\nmat4 influence;\ninfluence=getBoneMatrix(matricesIndices[0])*matricesWeights[0];\n#if NUM_BONE_INFLUENCERS>1\ninfluence+=getBoneMatrix(matricesIndices[1])*matricesWeights[1];\n#endif \n#if NUM_BONE_INFLUENCERS>2\ninfluence+=getBoneMatrix(matricesIndices[2])*matricesWeights[2];\n#endif \n#if NUM_BONE_INFLUENCERS>3\ninfluence+=getBoneMatrix(matricesIndices[3])*matricesWeights[3];\n#endif \n#if NUM_BONE_INFLUENCERS>4\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[0])]*matricesWeightsExtra[0];\n#endif \n#if NUM_BONE_INFLUENCERS>5\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[1])]*matricesWeightsExtra[1];\n#endif \n#if NUM_BONE_INFLUENCERS>6\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[2])]*matricesWeightsExtra[2];\n#endif \n#if NUM_BONE_INFLUENCERS>7\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[3])]*matricesWeightsExtra[3];\n#endif \nfinalWorld=finalWorld*influence;\n#endif\n#endif\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif \n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\n\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['nutSimple100PixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif \n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,baseColor.a*alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";
BABYLON.Effect.ShadersStore['nutSimple300VertexShader'] = "precision highp float;\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n\n#if NUM_BONE_INFLUENCERS>0\nattribute vec4 matricesIndices;\nattribute vec4 matricesWeights;\n#if NUM_BONE_INFLUENCERS>4\nattribute vec4 matricesIndicesExtra;\nattribute vec4 matricesWeightsExtra;\n#endif\n#ifdef USE_BONE_TEXTURE\nuniform sampler2D boneSampler;\n#ifdef SUPPORT_FLOAT_TEXTURE\nmat4 getBoneMatrix(const float i)\n{\nivec2 boneTextureSize=textureSize(boneSampler,0);\nfloat j=i*4.0;\nfloat x=mod(j,float(boneTextureSize.x));\nfloat y=floor(j/float(boneTextureSize.y));\nfloat dx=1.0/float(boneTextureSize.x);\nfloat dy=1.0/float(boneTextureSize.y);\ny=dy*(y+0.5);\nvec4 v1=texture(boneSampler,vec2(dx*(x+0.5),y));\nvec4 v2=texture(boneSampler,vec2(dx*(x+1.5),y));\nvec4 v3=texture(boneSampler,vec2(dx*(x+2.5),y));\nvec4 v4=texture(boneSampler,vec2(dx*(x+3.5),y));\nmat4 bone=mat4(v1,v2,v3,v4);\nreturn bone;\n}\n#else\nfloat decodeRGBA2Float (float dx,float X,float Y,float index) {\nfloat i0=index*2.0+0.5;\nfloat i1=index*2.0+1.5;\n\nvec4 rgba0=texture(boneSampler,vec2(dx*(X+i0),Y));\nvec4 rgba1=texture(boneSampler,vec2(dx*(X+i1),Y));\nfloat frac_=dot(rgba0,vec4(1.0,1.0/255.0,1.0/65025.0,1.0/160581375.0));\nfloat decimal_=floor(rgba1.r*255.0+0.5)+floor(rgba1.g*255.0+0.5)*255.0+floor(rgba1.b*255.0+0.5)*65025.0;\nfloat f=(decimal_+frac_)*(rgba1.a*2.0-1.0);\nreturn f;\n}\nmat4 getBoneMatrix(const float i) {\nivec2 boneTextureSize=textureSize(boneSampler,0);\nfloat j=i*32.0;\nfloat x=mod(j,float(boneTextureSize.x));\nfloat y=floor(j/float(boneTextureSize.y));\nfloat dx=1.0/float(boneTextureSize.x);\nfloat dy=1.0/float(boneTextureSize.y);\ny=dy*(y+0.5);\nfloat f00=decodeRGBA2Float(dx,x,y,0.0);\nfloat f01=decodeRGBA2Float(dx,x,y,1.0);\nfloat f02=decodeRGBA2Float(dx,x,y,2.0);\nfloat f03=decodeRGBA2Float(dx,x,y,3.0);\nfloat f10=decodeRGBA2Float(dx,x,y,4.0);\nfloat f11=decodeRGBA2Float(dx,x,y,5.0);\nfloat f12=decodeRGBA2Float(dx,x,y,6.0);\nfloat f13=decodeRGBA2Float(dx,x,y,7.0);\nfloat f20=decodeRGBA2Float(dx,x,y,8.0);\nfloat f21=decodeRGBA2Float(dx,x,y,9.0);\nfloat f22=decodeRGBA2Float(dx,x,y,10.0);\nfloat f23=decodeRGBA2Float(dx,x,y,11.0);\nfloat f30=decodeRGBA2Float(dx,x,y,12.0);\nfloat f31=decodeRGBA2Float(dx,x,y,13.0);\nfloat f32=decodeRGBA2Float(dx,x,y,14.0);\nfloat f33=decodeRGBA2Float(dx,x,y,15.0);\nmat4 bone=mat4( vec4(f00,f01,f02,f03),\nvec4(f10,f11,f12,f13),\nvec4(f20,f21,f22,f23),\nvec4(f30,f31,f32,f33));\nreturn bone;\n}\n#endif\n#endif\n#endif\n\n#include<instancesDeclaration>\nuniform mat4 view;\nuniform mat4 viewProjection;\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\n#ifdef USE_BONE_TEXTURE\n#if NUM_BONE_INFLUENCERS>0\nmat4 influence;\ninfluence=getBoneMatrix(matricesIndices[0])*matricesWeights[0];\n#if NUM_BONE_INFLUENCERS>1\ninfluence+=getBoneMatrix(matricesIndices[1])*matricesWeights[1];\n#endif \n#if NUM_BONE_INFLUENCERS>2\ninfluence+=getBoneMatrix(matricesIndices[2])*matricesWeights[2];\n#endif \n#if NUM_BONE_INFLUENCERS>3\ninfluence+=getBoneMatrix(matricesIndices[3])*matricesWeights[3];\n#endif \n#if NUM_BONE_INFLUENCERS>4\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[0])]*matricesWeightsExtra[0];\n#endif \n#if NUM_BONE_INFLUENCERS>5\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[1])]*matricesWeightsExtra[1];\n#endif \n#if NUM_BONE_INFLUENCERS>6\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[2])]*matricesWeightsExtra[2];\n#endif \n#if NUM_BONE_INFLUENCERS>7\ninfluence+=getBoneMatrix[int(matricesIndicesExtra[3])]*matricesWeightsExtra[3];\n#endif \nfinalWorld=finalWorld*influence;\n#endif\n#endif\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif \n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef DIFFUSE\nif (vDiffuseInfos.x == 0.)\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}\nelse\n{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n\n#include<clipPlaneVertex>\n\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\n\n#endif\n\n#ifdef POINTSIZE\ngl_PointSize=pointSize;\n#endif\n}\n";
BABYLON.Effect.ShadersStore['nutSimple300PixelShader'] = "precision highp float;\n\nuniform vec3 vEyePosition;\nuniform vec4 vDiffuseColor;\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n\n#include<helperFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef DIFFUSE\nvarying vec2 vDiffuseUV;\nuniform sampler2D diffuseSampler;\nuniform vec2 vDiffuseInfos;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition-vPositionW);\n\nvec4 baseColor=vec4(1.,1.,1.,1.);\nvec3 diffuseColor=vDiffuseColor.rgb;\n\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nbaseColor=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\n#include<depthPrePass>\nbaseColor.rgb*=vDiffuseInfos.y;\n#endif\n#ifdef VERTEXCOLOR\nbaseColor.rgb*=vColor.rgb;\n#endif\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW);\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);\n#endif\n\nvec3 diffuseBase=vec3(0.,0.,0.);\nlightingInfo info;\nfloat shadow=1.;\nfloat glossiness=0.;\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif \n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\nvec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;\n\nvec4 color=vec4(finalDiffuse,baseColor.a*alpha);\n#include<fogFragment>\ngl_FragColor=color;\n}";

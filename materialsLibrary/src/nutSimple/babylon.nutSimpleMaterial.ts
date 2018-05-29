/// <reference path="../../../dist/preview release/babylon.d.ts"/>import { RawTexture } from "babylonjs";import { Tools } from "babylonjs";

module BABYLON {
    class NutSimpleMaterialDefines extends MaterialDefines {
        public DIFFUSE = false;
        public CLIPPLANE = false;
        public ALPHATEST = false;
        public DEPTHPREPASS = false;
        public POINTSIZE = false;
        public FOG = false;
        public NORMAL = false;
        public UV1 = false;
        public UV2 = false;
        public VERTEXCOLOR = false;
        public VERTEXALPHA = false;
        public NUM_BONE_INFLUENCERS = 0;
        public BonesPerMesh = 0;
        public INSTANCES = false;
        public USE_BONE_TEXTURE = false;
        public SUPPORT_FLOAT_TEXTURE = false;

        constructor() {
            super();
            this.rebuild();
        }
    }

    export class NutSimpleMaterial extends PushMaterial {
        @serializeAsTexture("diffuseTexture")
        private _diffuseTexture: BaseTexture;
        @serializeAsTexture("boneTexture")
        private _boneTexture: RawTexture;
        @expandToProperty("_markAllSubMeshesAsTexturesDirty")
        public diffuseTexture: BaseTexture;

        @serializeAsColor3("diffuse")
        public diffuseColor = new Color3(1, 1, 1);
        
        @serialize("disableLighting")
        private _disableLighting = false;
        @expandToProperty("_markAllSubMeshesAsLightsDirty")
        public disableLighting: boolean;   
        
        @serialize("maxSimultaneousLights")
        private _maxSimultaneousLights = 4;
        @expandToProperty("_markAllSubMeshesAsLightsDirty")
        public maxSimultaneousLights: number; 

        @serialize()
        public forceAlphaBlend = false;

        private _renderId: number;

        constructor(name: string, scene: Scene) {
            super(name, scene);
        }

        public needAlphaBlending(): boolean {
            if (this.forceAlphaBlend || this.alpha < 1.0) {
                return true;
            } else {
                return false;
            }
        }

        public needAlphaTesting(): boolean {
            return false;
        }

        public getAlphaTestTexture(): Nullable<BaseTexture> {
            return null;
        }

        // Methods   
        public isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh, useInstances?: boolean): boolean {   
            if (this.isFrozen) {
                if (this._wasPreviouslyReady && subMesh.effect) {
                    return true;
                }
            }

            if (!subMesh._materialDefines) {
                subMesh._materialDefines = new NutSimpleMaterialDefines();
            }

            var defines = <NutSimpleMaterialDefines>subMesh._materialDefines;
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
                    if (this._diffuseTexture && StandardMaterial.DiffuseTextureEnabled) {
                        if (!this._diffuseTexture.isReady()) {
                            return false;
                        } else {
                            defines._needUVs = true;
                            defines.DIFFUSE = true;
                        }
                    }                
                }
            }

            // Misc.
            MaterialHelper.PrepareDefinesForMisc(mesh, scene, false, this.pointsCloud, this.fogEnabled, defines);

            // Lights
            defines._needNormals = MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, false, this._maxSimultaneousLights, this._disableLighting);

            // Values that need to be evaluated on every frame
            MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, defines, useInstances ? true : false);
            
            // Attribs
            // NOTE: 4th argument turned off, do not use default bone implementation.
            MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, false);

            if (mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
                defines["NUM_BONE_INFLUENCERS"] = mesh.numBoneInfluencers;
                defines["BonesPerMesh"] = (mesh.skeleton.bones.length + 1);
                defines["USE_BONE_TEXTURE"] = true;
            }

            if (caps.textureFloat) {
                defines["SUPPORT_FLOAT_TEXTURE"] = true
            }

            // Get correct effect      
            if (defines.isDirty) {
                defines.markAsProcessed();
                scene.resetCachedMaterial();

                // Fallbacks
                var fallbacks = new EffectFallbacks();             
                if (defines.FOG) {
                    fallbacks.addFallback(1, "FOG");
                }

                MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
                
                if (defines.NUM_BONE_INFLUENCERS > 0) {
                    fallbacks.addCPUSkinningFallback(0, mesh);
                }

                //Attributes
                var attribs = [VertexBuffer.PositionKind];

                if (defines.NORMAL) {
                    attribs.push(VertexBuffer.NormalKind);
                }

                if (defines.UV1) {
                    attribs.push(VertexBuffer.UVKind);
                }

                if (defines.UV2) {
                    attribs.push(VertexBuffer.UV2Kind);
                }

                if (defines.VERTEXCOLOR) {
                    attribs.push(VertexBuffer.ColorKind);
                }

                // NOTE: 
                MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);

                MaterialHelper.PrepareAttributesForInstances(attribs, defines);

                var shaderName = (engine.webGLVersion > 1) ? 'nutSimple300' : 'nutSimple100';
                var join = defines.toString();
                var uniforms = ["world", "view", "viewProjection", "vEyePosition", "vLightsType", "vDiffuseColor",
                                "vFogInfos", "vFogColor", "pointSize",
                                "vDiffuseInfos", 
                                "vClipPlane", "diffuseMatrix"
                ];
                var samplers = ["diffuseSampler"];
                var uniformBuffers = new Array<string>()

                if (mesh.useBones && mesh.computeBonesUsingShaders && mesh.skeleton) {
                    samplers.push("boneSampler");

                    if (engine.webGLVersion === 1) {
                        uniforms.push("boneSamplerSize");
                    }
                }

                MaterialHelper.PrepareUniformsAndSamplersList(<EffectCreationOptions>{
                    uniformsNames: uniforms, 
                    uniformBuffersNames: uniformBuffers,
                    samplers: samplers, 
                    defines: defines, 
                    maxSimultaneousLights: this.maxSimultaneousLights
                });
                subMesh.setEffect(scene.getEngine().createEffect(shaderName,
                    <EffectCreationOptions>{
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
        }

        public bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void {
            var scene = this.getScene();
            var engine = scene.getEngine();

            var defines = <NutSimpleMaterialDefines>subMesh._materialDefines;
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
                    var size = Tools.CeilingPOT(Math.ceil(Math.sqrt(matrices.length / 16 * 4)));
                    var boneTextureData = new Float32Array(new ArrayBuffer(size * size * 4 * 4));
                    boneTextureData.set(matrices);

                    if (!this._boneTexture) {
                        this._boneTexture = RawTexture.CreateRGBATexture(boneTextureData, size, size, scene, false, false, Texture.NEAREST_SAMPLINGMODE, Engine.TEXTURETYPE_FLOAT);
                    } else {
                        this._boneTexture.update(boneTextureData);
                    }
                } else {
                    // Convert to 1 float32 to 2 RBGA values
                    var size = Tools.CeilingPOT(Math.ceil(Math.sqrt(matrices.length * 2)));
                    var boneTextureData = new Uint8Array(new ArrayBuffer(size * size * 4));
                    Tools.ConvertMatricesToRGBA8(matrices, boneTextureData, matrices.length / (4 * 4));

                    if (!this._boneTexture) { 
                        this._boneTexture = RawTexture.CreateRGBATexture(boneTextureData, size, size, scene, false, false, Texture.NEAREST_SAMPLINGMODE, Engine.TEXTURETYPE_UNSIGNED_INT);
                    } else {
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
                if (this._diffuseTexture && StandardMaterial.DiffuseTextureEnabled) {
                    this._activeEffect.setTexture("diffuseSampler", this._diffuseTexture);

                    this._activeEffect.setFloat2("vDiffuseInfos", this._diffuseTexture.coordinatesIndex, this._diffuseTexture.level);
                    this._activeEffect.setMatrix("diffuseMatrix", this._diffuseTexture.getTextureMatrix());
                }
                
                // Clip plane
                MaterialHelper.BindClipPlane(this._activeEffect, scene);

                // Point size
                if (this.pointsCloud) {
                    this._activeEffect.setFloat("pointSize", this.pointSize);
                }

                MaterialHelper.BindEyePosition(effect, scene);
            }

            this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);

            // Lights
            if (scene.lightsEnabled && !this.disableLighting) {
                MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);          
            }

            // View
            if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== Scene.FOGMODE_NONE) {
                this._activeEffect.setMatrix("view", scene.getViewMatrix());
            }

            // Fog
            MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);

            this._afterBind(mesh, this._activeEffect);
        }

        public getAnimatables(): IAnimatable[] {
            var results = [];

            if (this._diffuseTexture && this._diffuseTexture.animations && this._diffuseTexture.animations.length > 0) {
                results.push(this._diffuseTexture);
            }

            return results;
        }

        public getActiveTextures(): BaseTexture[] {
            var activeTextures = super.getActiveTextures();

            if (this._diffuseTexture) {
                activeTextures.push(this._diffuseTexture);
            }

            return activeTextures;
        }

        public hasTexture(texture: BaseTexture): boolean {
            if (super.hasTexture(texture)) {
                return true;
            }

            if (this.diffuseTexture === texture) {
                return true;
            } 

            return false;    
        }        

        public dispose(forceDisposeEffect?: boolean): void {
            if (this._diffuseTexture) {
                this._diffuseTexture.dispose();
            }

            if (this._boneTexture) {
                this._boneTexture.dispose();
            }

            super.dispose(forceDisposeEffect);
        }

        public clone(name: string): NutSimpleMaterial {
            return SerializationHelper.Clone<NutSimpleMaterial>(() => new NutSimpleMaterial(name, this.getScene()), this);
        }
        
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            serializationObject.customType = "BABYLON.NutSimpleMaterial";
            return serializationObject;
        }

        public getClassName(): string {
            return "NutSimpleMaterial";
        }               
        
        // Statics
        public static Parse(source: any, scene: Scene, rootUrl: string): NutSimpleMaterial {
            return SerializationHelper.Parse(() => new NutSimpleMaterial(source.name, scene), source, scene, rootUrl);
        }
    }
} 


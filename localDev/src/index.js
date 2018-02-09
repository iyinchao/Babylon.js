var meshKindMap = {
    mesh19: 'body',
    mesh20: 'arm',
    mesh23: 'top',
    mesh24: 'top-arm',
    mesh27: 'sock',
    mesh30: 'bottom',
    mesh33: 'face',
    mesh36: 'hair',
    mesh37: 'hair-back',
    mesh40: 'under',
    mesh43: 'shoe',
    mesh96: 'closed-eye',
    mesh99: 'mouth',
}

var getProgramInfo = function (gl, program) {
    var result = {
        attributes: [],
        uniforms: [],
        attributeCount: 0,
        uniformCount: 0
    },

    activeUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS),
    activeAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  
    // Taken from the WebGl spec:
    // http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14
    var enums = {
        0x8B50: 'FLOAT_VEC2',
        0x8B51: 'FLOAT_VEC3',
        0x8B52: 'FLOAT_VEC4',
        0x8B53: 'INT_VEC2',
        0x8B54: 'INT_VEC3',
        0x8B55: 'INT_VEC4',
        0x8B56: 'BOOL',
        0x8B57: 'BOOL_VEC2',
        0x8B58: 'BOOL_VEC3',
        0x8B59: 'BOOL_VEC4',
        0x8B5A: 'FLOAT_MAT2',
        0x8B5B: 'FLOAT_MAT3',
        0x8B5C: 'FLOAT_MAT4',
        0x8B5E: 'SAMPLER_2D',
        0x8B60: 'SAMPLER_CUBE',
        0x1400: 'BYTE',
        0x1401: 'UNSIGNED_BYTE',
        0x1402: 'SHORT',
        0x1403: 'UNSIGNED_SHORT',
        0x1404: 'INT',
        0x1405: 'UNSIGNED_INT',
        0x1406: 'FLOAT'
    };
  
    // Loop through active uniforms
    for (var i=0; i < activeUniforms; i++) {
        var uniform = gl.getActiveUniform(program, i);
        uniform.typeName = enums[uniform.type];
        result.uniforms.push(uniform);
        result.uniformCount += uniform.size;
    }
  
    // Loop through active attributes
    for (var i=0; i < activeAttributes; i++) {
        var attribute = gl.getActiveAttrib(program, i);
        attribute.typeName = enums[attribute.type];
        result.attributes.push(attribute);
        result.attributeCount += attribute.size;
    }
  
    return result;
  }

function transformTexture (scene) {
    // Filter out target meshes
    const keys = Object.keys(meshKindMap)
    const activeMeshes = scene.meshes.filter((mesh, index) => {
        if (keys.indexOf(mesh.id) > -1) {
            return true
        }
    })

    window.activeMeshes = activeMeshes

    const mat = new BABYLON.NutSimpleMaterial('simple', scene)
    // TODO: wrong face definition
    mat.backFaceCulling = false
    // mat.alpha = 0.999

    activeMeshes.forEach((mesh) => {
        // clone texture
        const tList = mesh.material.getActiveTextures()
        if (tList.length > 0) {
            const texture = tList[0].clone()

            // replace materials
            mesh.material = mat.clone()
            mesh.material.diffuseTexture = texture
        }
    })


    setTimeout(() => {
        activeMeshes.forEach((mesh) => {
          console.log(getProgramInfo(engine._gl, (mesh.material.getEffect())._program))
        })
      }, 3000)
}
  

var createVue = function () {
    const nodeTreeItem = Vue.extend({
        name: 'node-tree-item',
        template: '#vue-node-tree-item',
        data: function () {
            return {
                isExpand: false,
                isAnimatableCacheValid: false,
                animatableCache: null,
                isChildrenCacheValid: false,
                childrenCache: null
            }
        },
        props: {
            itemData: {
                type: Object,
                default: function () {
                    return {}
                }
            },
            type: {
                type: String,
                default: 'mesh'
            }
        },
        computed: {
            isSelected () {
                return this.$root.currentSelectedItem === this.itemData
            }
        },
        methods: {
            setExpand (isExpand = true) {
                this.isExpand = !!isExpand
                if (!this.isChildrenCacheValid && this.itemData.c) {
                    this.childrenCache = this.itemData.c
                    this.isChildrenCacheValid = true
                }
            },
            onExpandIconClick () {
                this.setExpand(!this.isExpand)
            },
            getAnimatable () {
                if (isAnimatableCacheValid) {
                    return this.animatableCache
                }

                this.animatableCache
            },
            onRowMouseEnter () {
                this.itemData.data.showBoundingBox = true
            },
            onRowMouseLeave () {
                this.itemData.data.showBoundingBox = false
            },
            onRowClick () {
                if (!this.isSelected) {
                    this.$root.$emit('selectItem', this.itemData)
                } else {
                    this.$root.$emit('selectItem', null)
                }
            }
        },
        mounted () {

        }
    });

    const nodeTree = Vue.extend({
        name: 'node-tree',
        template: '#vue-node-tree',
        props: {
            tree: {
                type: Object,
                default: null
            },
            type: {
                type: String,
                default: 'mesh'
            }
        },
        components: {
            nodeTreeItem: nodeTreeItem
        }
    });

    window.$rootVue = new Vue({
        template: '#vue-root',
        data: { 
            meshTree: null,
            currentSelectedItem: null,
            textureList: {}
        },
        components: {
            nodeTree: nodeTree
        },
        computed: {
            currentSelectedItemType () {
                if (this.currentSelectedItem && this.currentSelectedItem.data instanceof BABYLON.Mesh) {
                    return 'Mesh'
                } else {
                    return ''
                }
            },
            currentTextureUid () {
                if (this.currentSelectedItemType === 'Mesh') {
                    const material = this.currentSelectedItem.data.material
                    if (material && material.albedoTexture) {
                        return material.albedoTexture.uid
                    }
                } else {
                    return ''
                }
            }
        },
        watch: {
            currentTextureUid (uid) {
                this.$nextTick(() => {
                    if (this.textureList[uid] && this.$refs.texturePreview) {
                        this.$refs.texturePreview.innerHTML = ''
                        let imgDom = null
                        if (this.textureList[uid]._texture._buffer instanceof Image) {
                            imgDom = this.textureList[uid]._texture._buffer
                        } else {
                            imgDom = new Image()
                            imgDom.src = this.textureList[uid]._texture.url
                        }

                        this.$refs.texturePreview.appendChild(imgDom)
                    }
                })
            }
        },
        methods: {
            generateTreeData (type = 'mesh') {
                const scene = window.$babylon.scene

                const trees = []

                const buildTreeFromRoot = (root) => {
                    root.$traveled = true
                    
                    const ret = {
                        data: root
                    }

                    if (type === 'mesh' && root.material && root.material.albedoTexture) {
                        this.addTextureList(root.material.albedoTexture)
                    }

                    const desc = root.getDescendants(true)

                    if (desc.length) {
                        ret.c = []
                        for (let i = 0; i < desc.length; i++) {
                            desc[i].$traveled = true

                            const wrongIndex = trees.indexOf(desc[i])
                            if (wrongIndex > -1) {
                                ret.c.push(trees.splice(wrongIndex, 1))
                                continue
                            }

                            ret.c.push(buildTreeFromRoot(desc[i]))
                        }
                    }

                    return ret
                }
                
                if (type === 'mesh') {
                    const meshes = scene.meshes

                    for (let i = 0; i < meshes.length; i++) {
                        if (meshes[i].$traveled) {
                            continue
                        }

                        trees.push(buildTreeFromRoot(meshes[i]))
                    }

                    this.meshTree = trees
                }
            },
            addTextureList (texture) {
                this.textureList[texture.uid] = texture
            },
            onSelectItem (item) {
                if (item) {
                    this.currentSelectedItem = item
                } else {
                    this.currentSelectedItem = null
                }
            },
            onTextureItemClick (texture) {
                if (this.currentSelectedItemType === 'Mesh') {
                    if (this.currentSelectedItem.data.material) {
                        this.currentSelectedItem.data.material.albedoTexture = texture
                    }
                    
                }
            }
        },
        mounted () {
            this.$on('selectItem', this.onSelectItem)
        }
    });

    window.$rootVue.$mount('#ui')
}

var setTexture = function (mesh, texture) {
    if (mesh && mesh.material) {
        mesh.material.albedoTexture = texture
        mesh.material.opacityTexture = texture
    }
}

var delayCreateScene = function () {
    let query = {}
    if (document.location.search) {
        const qs = document.location.search.substring(1)
        const qsList = qs.split('&')
        qsList.forEach((item) => {
            const q = item.split('=')
            if (q[0]) {
                query[q[0]] = q[1]
            }
        })
    }

    let assetName = query.asset || 'bull'
    
    // Create a scene.
    var scene = new BABYLON.Scene(engine);

    scene.useRightHandedSystem = true;

    var showAxis = function(size) {
		var axisX = BABYLON.Mesh.CreateLines("axisX", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0) ], scene);
  		axisX.color = new BABYLON.Color3(1, 0, 0);
  		var axisY = BABYLON.Mesh.CreateLines("axisY", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0) ], scene);
  		axisY.color = new BABYLON.Color3(0, 1, 0);
  		var axisZ = BABYLON.Mesh.CreateLines("axisZ", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size) ], scene);
  		axisZ.color = new BABYLON.Color3(0, 0, 1);
	};

	showAxis(10);

    // Create a default skybox with an environment.
    // var hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("textures/environment.dds", scene);
    // var currentSkybox = scene.createDefaultSkybox(hdrTexture, true);

    // Append glTF model to scene.
    BABYLON.SceneLoader.Append(`https://dev.asset.qq.com/assets-local/${assetName}/`, "scene.gltf", scene, function (scene) {
        // Create a default arc rotate camera and light.
        // scene.createDefaultCameraOrLight(true, true, true);

        // // The default camera looks at the back of the asset.
        // // Rotate the camera by 180 degrees to the front of the asset.
        

        window.$rootVue.generateTreeData();

        // Get scene bounding box
        var worldExtends = scene.getWorldExtends();
        var worldSize = worldExtends.max.subtract(worldExtends.min);
        var worldCenter = worldExtends.min.add(worldSize.scale(0.5));
        
        var camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, worldSize.length() * 1.5, worldCenter, scene);
        camera.attachControl(canvas, true);

        // Create Light
        var hemiLight = new BABYLON.HemisphericLight("default light", BABYLON.Vector3.Up(), scene);
        hemiLight.intensity = 1.3;

        // scene.activeCamera.alpha += Math.PI;

        // Replace textures
        transformTexture(scene)

        // Load texture json
        // var assetsManager = new BABYLON.AssetsManager(scene);
        // var textureTask = assetsManager.addTextureTask('image task', 'https://dev.asset.qq.com/assets-local/textures/hair_6_1.png');
        // textureTask.onSuccess = function(task) {
        //     console.log(task)
        //     // window.$texture = task.texture;
        //     task.texture.hasAlpha = true;

        //     window.$rootVue.addTextureList(task.texture)
        // }

        // assetsManager.load();

        // var t = new BABYLON.TextureAssetTask('image task', 'https://dev.asset.qq.com/assets-local/textures/hair_6_1.png')
        // t.run(scene, () => { console.log('haha') })
    });

    window.$babylon = {}
    window.$babylon.scene = scene

    createVue()

    return scene;
};
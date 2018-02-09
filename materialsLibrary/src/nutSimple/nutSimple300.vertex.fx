precision highp float;

// Attributes
attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif

// NOTE: Here comes the new bone Declaration fx
#if NUM_BONE_INFLUENCERS > 0
	attribute vec4 matricesIndices;
	attribute vec4 matricesWeights;
	#if NUM_BONE_INFLUENCERS > 4
		attribute vec4 matricesIndicesExtra;
		attribute vec4 matricesWeightsExtra;
	#endif

	#ifdef USE_BONE_TEXTURE
		uniform sampler2D boneSampler;

		#ifdef SUPPORT_FLOAT_TEXTURE
			mat4 getBoneMatrix(const float i)
			{
				ivec2 boneTextureSize = textureSize(boneSampler, 0);
				float j = i * 4.0;
				float x = mod(j, float(boneTextureSize.x));
				float y = floor(j / float(boneTextureSize.y));
				float dx = 1.0 / float(boneTextureSize.x);
				float dy = 1.0 / float(boneTextureSize.y);
				y = dy * (y + 0.5);
				vec4 v1 = texture(boneSampler, vec2(dx * (x + 0.5), y));
				vec4 v2 = texture(boneSampler, vec2(dx * (x + 1.5), y));
				vec4 v3 = texture(boneSampler, vec2(dx * (x + 2.5), y));
				vec4 v4 = texture(boneSampler, vec2(dx * (x + 3.5), y));
				mat4 bone = mat4(v1, v2, v3, v4);
				return bone;
			}
		#else
			float decodeRGBA2Float (float dx, float X, float Y, float index) {
				float i0 = index*2.0 + 0.5;
				float i1 = index*2.0 + 1.5;
				// NOTE: here we use 300 version of function, so texture2D is not supported
				vec4 rgba0 = texture(boneSampler, vec2(dx * (X + i0), Y));
				vec4 rgba1 = texture(boneSampler, vec2(dx * (X + i1), Y));

				float frac_ = dot(rgba0, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/160581375.0));
				float decimal_ = floor(rgba1.r*255.0 + 0.5) + floor(rgba1.g*255.0 + 0.5)*255.0 + floor(rgba1.b*255.0 + 0.5)*65025.0;
				float f = (decimal_ + frac_) * (rgba1.a*2.0 - 1.0);
				return f;
			}

			mat4 getBoneMatrix(const float i) {
				ivec2 boneTextureSize = textureSize(boneSampler, 0);

				float j = i * 32.0;
				float x = mod(j, float(boneTextureSize.x));
				float y = floor(j / float(boneTextureSize.y));
				float dx = 1.0 / float(boneTextureSize.x);
				float dy = 1.0 / float(boneTextureSize.y);
				y = dy * (y + 0.5);

				float f00 = decodeRGBA2Float(dx, x, y, 0.0);
				float f01 = decodeRGBA2Float(dx, x, y, 1.0);
				float f02 = decodeRGBA2Float(dx, x, y, 2.0);
				float f03 = decodeRGBA2Float(dx, x, y, 3.0);
											
				float f10 = decodeRGBA2Float(dx, x, y, 4.0);
				float f11 = decodeRGBA2Float(dx, x, y, 5.0);
				float f12 = decodeRGBA2Float(dx, x, y, 6.0);
				float f13 = decodeRGBA2Float(dx, x, y, 7.0);
											
				float f20 = decodeRGBA2Float(dx, x, y, 8.0);
				float f21 = decodeRGBA2Float(dx, x, y, 9.0);
				float f22 = decodeRGBA2Float(dx, x, y, 10.0);
				float f23 = decodeRGBA2Float(dx, x, y, 11.0);
												
				float f30 = decodeRGBA2Float(dx, x, y, 12.0);
				float f31 = decodeRGBA2Float(dx, x, y, 13.0);
				float f32 = decodeRGBA2Float(dx, x, y, 14.0);
				float f33 = decodeRGBA2Float(dx, x, y, 15.0);

				mat4 bone = mat4(		vec4(f00, f01, f02, f03), 
										vec4(f10, f11, f12, f13), 
										vec4(f20, f21, f22, f23), 
										vec4(f30, f31, f32, f33));
				return bone;
			}
		#endif
	#endif
#endif

// Uniforms
#include<instancesDeclaration>

uniform mat4 view;
uniform mat4 viewProjection;

#ifdef DIFFUSE
varying vec2 vDiffuseUV;
uniform mat4 diffuseMatrix;
uniform vec2 vDiffuseInfos;
#endif

#ifdef POINTSIZE
uniform float pointSize;
#endif

// Output
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif

#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif


#include<clipPlaneVertexDeclaration>

#include<fogVertexDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]



void main(void) {

#include<instancesVertex>

#ifdef USE_BONE_TEXTURE
	#if NUM_BONE_INFLUENCERS > 0
		mat4 influence;
		influence = getBoneMatrix(matricesIndices[0]) * matricesWeights[0];

		#if NUM_BONE_INFLUENCERS > 1
			influence += getBoneMatrix(matricesIndices[1]) * matricesWeights[1];
		#endif	
		#if NUM_BONE_INFLUENCERS > 2
			influence += getBoneMatrix(matricesIndices[2]) * matricesWeights[2];
		#endif	
		#if NUM_BONE_INFLUENCERS > 3
			influence += getBoneMatrix(matricesIndices[3]) * matricesWeights[3];
		#endif	

		#if NUM_BONE_INFLUENCERS > 4
			influence += getBoneMatrix[int(matricesIndicesExtra[0])] * matricesWeightsExtra[0];
		#endif	
		#if NUM_BONE_INFLUENCERS > 5
			influence += getBoneMatrix[int(matricesIndicesExtra[1])] * matricesWeightsExtra[1];
		#endif	
		#if NUM_BONE_INFLUENCERS > 6
			influence += getBoneMatrix[int(matricesIndicesExtra[2])] * matricesWeightsExtra[2];
		#endif	
		#if NUM_BONE_INFLUENCERS > 7
			influence += getBoneMatrix[int(matricesIndicesExtra[3])] * matricesWeightsExtra[3];
		#endif	

		finalWorld = finalWorld * influence;
	#endif
#endif

	gl_Position = viewProjection * finalWorld * vec4(position, 1.0);

	vec4 worldPos = finalWorld * vec4(position, 1.0);
	vPositionW = vec3(worldPos);

#ifdef NORMAL
	vNormalW = normalize(vec3(finalWorld * vec4(normal, 0.0)));
#endif

	// Texture coordinates
#ifndef UV1
	vec2 uv = vec2(0., 0.);
#endif 
#ifndef UV2
	vec2 uv2 = vec2(0., 0.);
#endif

#ifdef DIFFUSE
	if (vDiffuseInfos.x == 0.)
	{
		vDiffuseUV = vec2(diffuseMatrix * vec4(uv, 1.0, 0.0));
	}
	else
	{
		vDiffuseUV = vec2(diffuseMatrix * vec4(uv2, 1.0, 0.0));
	}
#endif

	// Clip plane
#include<clipPlaneVertex>

    // Fog
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]

	// Vertex color
#ifdef VERTEXCOLOR
	// vColor = color;
#endif

	// Point size
#ifdef POINTSIZE
	gl_PointSize = pointSize;
#endif
}

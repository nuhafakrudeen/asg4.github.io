class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.normalMatrix = new Matrix4();
        this.textureNum = -1;
        this.cubeVerts32 = new Float32Array([
            0, 0, 0,  1, 1, 0,  1, 0, 0,
            0, 0, 0,  0, 1, 0,  1, 1, 0,
            0, 1, 0,  0, 1, 1,  1, 1, 1,
            0, 1, 0,  1, 1, 1,  1, 1, 0,
            1, 1, 0,  1, 1, 1,  1, 0, 0,
            1, 0, 0,  1, 1, 1,  1, 0, 1,
            0, 1, 0,  0, 1, 1,  0, 0, 0,
            0, 0, 0,  0, 1, 1,  0, 0, 1,
            0, 0, 0,  0, 0, 1,  1, 0, 1,
            0, 0, 0,  1, 0, 1,  1, 0, 0,
            0, 0, 1,  1, 1, 1,  1, 0, 1,
            0, 0, 1,  0, 1, 1,  1, 1, 1
        ]);
        this.vertexBuffer = null;
    }

    render() {
        var rgba = this.color;

        gl.uniform1i(u_whichTexture, this.textureNum);

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        drawTriangle3DUVNormal(
            [0, 0, 0, 1, 1, 0, 1, 0, 0],
            [0, 0, 1, 1, 1, 0],
            [0, 0, -1, 0, 0, -1, 0, 0, -1]);
        drawTriangle3DUVNormal([0, 0, 0, 0, 1, 0, 1, 1, 0], [0,0,0,1,1,1], [0, 0, -1, 0, 0, -1, 0, 0, -1]);

        // Top of cube
        drawTriangle3DUVNormal([0, 1, 0, 0, 1, 1, 1, 1, 1], [0,0,0,1,1,1], [0, 1, 0, 0, 1, 0, 0, 1, 0]);
        drawTriangle3DUVNormal([0, 1, 0, 1, 1, 1, 1, 1, 0], [0,0,1,1,1,0], [0, 1, 0, 0, 1, 0, 0, 1, 0]);
        
        // Right 
        drawTriangle3DUVNormal([1, 1, 0, 1, 1, 1, 1, 0, 0], [0,0,0,1,1,1], [1, 0, 0, 1, 0, 0, 1, 0, 0]);
        drawTriangle3DUVNormal([1, 0, 0, 1, 1, 1, 1, 0, 1], [0,0,1,1,1,0], [1, 0, 0, 1, 0, 0, 1, 0, 0]);
        
        // Left
        drawTriangle3DUVNormal([0, 1, 0, 0, 1, 1, 0, 0, 0], [0,0,0,1,1,1], [-1, 0, 0, -1, 0, 0, -1, 0, 0]);
        drawTriangle3DUVNormal([0, 0, 0, 0, 1, 1, 0, 0, 1], [0,0,1,1,1,0], [-1, 0, 0, -1, 0, 0, -1, 0, 0]);

        // Bottom
        drawTriangle3DUVNormal([0, 0, 0, 0, 0, 1, 1, 0, 1], [0,0,0,1,1,1], [0, -1, 0, 0, -1, 0, 0, -1, 0]);
        drawTriangle3DUVNormal([0, 0, 0, 1, 0, 1, 1, 0, 0], [0,0,1,1,1,0], [0, -1, 0, 0, -1, 0, 0, -1, 0]);

        // Back
        drawTriangle3DUVNormal([0, 0, 1, 1, 1, 1, 1, 0, 1], [0,0,0,1,1,1], [0, 0, 1, 0, 0, 1, 0, 0, 1]);
        drawTriangle3DUVNormal([0, 0, 1, 0, 1, 1, 1, 1, 1], [0,0,1,1,1,0], [0, 0, 1, 0, 0, 1, 0, 0, 1]);
    }
    renderfast() { 
        var rgba = this.color;

        gl.uniform1i(u_whichTexture, -2);

        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var allverts = [];

        // Front
        allverts = allverts.concat([0, 0, 0, 1, 1, 0, 1, 0, 0]);
        allverts = allverts.concat([0, 0, 0, 0, 1, 0, 1, 1, 0]);

        // Top
        allverts = allverts.concat([0, 1, 0, 0, 1, 1, 1, 1, 1]);
        allverts = allverts.concat([0, 1, 0, 1, 1, 1, 1, 1, 0]);

        // Right
        allverts = allverts.concat([1, 1, 0, 1, 1, 1, 1, 0, 0]);
        allverts = allverts.concat([1, 0, 0, 1, 1, 1, 1, 0, 1]);

        // Left
        allverts = allverts.concat([0, 1, 0, 0, 1, 1, 0, 0, 0]);
        allverts = allverts.concat([0, 0, 0, 0, 1, 1, 0, 0, 1]);

        // Bottom
        allverts = allverts.concat([0, 0, 0, 0, 0, 1, 1, 0, 1]);
        allverts = allverts.concat([0, 0, 0, 1, 0, 1, 1, 0, 0]);

        // Right
        allverts = allverts.concat([0, 0, 1, 1, 1, 1, 1, 0, 1]);
        allverts = allverts.concat([0, 0, 1, 0, 1, 1, 1, 1, 1]);
    
        drawTriangle3D(allverts);
    }

    renderfaster() {
        gl.uniform1i(u_whichTexture, -2);

        var rgba = this.color;
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts32, gl.DYNAMIC_DRAW);

        this.vertexBuffer = gl.createBuffer();
        if (this.vertexBuffer === null) {
            console.log('Failed to create the buffer object');
            gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
        }

        gl.enableVertexAttribArray(a_Position);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
}
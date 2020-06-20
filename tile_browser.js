'use strict';

const e = React.createElement;

class ImageTileBrowser extends React.Component {
    constructor(props) {
        super(props);
        this.host = props.host;
        this.getTilePath = props.getTilePath;
        this.availableImagesPath = props.availableImagesPath;
        this.getPropsPath = props.getPropsPath;
        this.getPreviewPath = props.getPreviewPath;
        this.maxImageSide = props.maxImageSide;

        this.previewCanvas = React.createRef();
        this.prevClickX = -1;
        this.prevClickY = -1;
        this.dblClickZoomTimer = null;

        this.state = {
            startX: props.initStartX,
            startY: props.initStartY,
            xLen: props.initXLen,
            yLen: props.initYLen,
            title: "Loading...",
            availableImages: [],
            moveDistance: 350,
            imgWidth: 0,
            imgHeight: 0,
            imgTagWidth: props.initXLen / 2,
            imageId: props.initImageId,
            imageLoaded: false,
            previewSize: 300,
            zoomInDisabled: false,
            zoomOutDisabled: false,
            imageTileUrl: this.host
                + this.getTilePath
                + "/" + props.initImageId
                + "/" + props.initStartX
                + "/" + props.initXLen
                + "/" + props.initStartY
                + "/" + props.initYLen
        };

        fetch( this.host + this.availableImagesPath)
            .then(res => res.json())
            .then((data) => {
                this.setState({ availableImages: data })
                if (data.size === 0) {
                    throw new Error("No images available from server!");
                }
                let imageId = data[0].id;
                let previewSize = this.state.previewSize;
                this.setState({imageId: imageId});

                fetch( this.host + this.getPropsPath + "/" + imageId)
                    .then(res => res.json())
                    .then((data) => {
                        this.setState({
                            imgWidth: data.width,
                            imgHeight: data.height,
                            title: data.title,
                            imageLoaded: true
                        });
                        this.updatePreviewImage();
                    })
                    .catch(console.log)
            })
            .catch(console.log)
    }

    componentWillMount() {
        document.addEventListener("keydown", this.handleKeyDown.bind(this));
    }

    moveInDirection = (xMovement, yMovement) => {
        let newXLen = this.state.xLen;
        let newYLen = this.state.yLen;
        let newStartX = this.state.startX + xMovement;
        let newStartY = this.state.startY + yMovement;

        if (this.state.moveDistance > this.state.imgWidth) {
            newStartX = 0;
            newXLen = this.state.imgWidth;
        }

        if (this.state.moveDistance > this.state.imgHeight) {
            newStartY = 0;
            newYLen = this.state.imgHeight;
        }

        this.moveTile(newStartX, newStartY, newXLen, newYLen);
    }

    handleImageDoubleClick() {
        if (!this.state.zoomInDisabled) {
            this.zoomIn();
        }
    }

    handlePreviewClick(e) {
        let canvas = this.previewCanvas.current;
        let boundingRect = canvas.getBoundingClientRect();
        let x = e.clientX - boundingRect.left;
        let y = e.clientY - boundingRect.top;

        if (this.dblClickZoomTimer !== null && !this.state.zoomInDisabled) {
                clearTimeout(this.dblClickZoomTimer);
                this.zoomInAndRelocate(x, y);
                this.dblClickZoomTimer = null;
        } else if (x !== this.prevClickX || y !== this.prevClickY) {
            if (this.state.zoomInDisabled) {
                this.moveByPreviewClick(x, y);
            } else {
                this.dblClickZoomTimer = setTimeout(() => {
                    this.moveByPreviewClick(x, y);
                    this.dblClickZoomTimer = null;
                }, 250);
            }

            console.log("X: " + x + ", Y: " + y);
        }

        this.prevClickX = x;
        this.prevClickY = y;
        e.preventDefault();
    }

    moveByPreviewClick(x, y) {
        let coOrds = this.getNewCoOrdsByPreviewClick(x, y);
        this.moveTile(coOrds.newX, coOrds.newY, this.state.xLen, this.state.yLen);
    }

    getNewCoOrdsByPreviewClick(x, y) {
        let prevImg = this.state.previewImage;
        let newX = Math.floor(((x / prevImg.width) * this.state.imgWidth) - (this.state.xLen / 2));
        let newY = Math.floor(((y / prevImg.height) * this.state.imgHeight) - (this.state.yLen / 2));

        if (newX < 0) {
            newX = 0;
        } else if (newX > this.state.imgWidth - this.state.xLen) {
            newX = this.state.imgWidth - this.state.xLen;
        }

        if (newY < 0) {
            newY = 0;
        } else if (newY > this.state.imgHeight - this.state.yLen) {
            newY = this.state.imgHeight - this.state.yLen;
        }

        return {
            newX: newX,
            newY: newY
        }
    }

    moveTile(newStartX, newStartY, newXLen, newYLen) {
        let coOrds = this.getNewTileCoOrds(newStartX, newStartY, newXLen, newYLen);

        this.setState(
            {
                imageTileUrl: this.host + this.getTilePath + "/" + this.state.imageId + "/" + coOrds.newStartX + "/" + coOrds.newXLen + "/" + coOrds.newStartY + "/" + coOrds.newYLen,
                startX: coOrds.newStartX,
                startY: coOrds.newStartY,
                xLen: coOrds.newXLen,
                yLen: coOrds.newYLen
            }
        );
    }

    getNewTileCoOrds(newStartX, newStartY, newXLen, newYLen) {
        let newEndX = newStartX + newXLen;
        let newEndY = newStartY + newYLen;

        if (newStartX < 0) {
            newStartX = 0;
            newEndX = newStartX + newXLen;
        }

        if (newStartY < 0) {
            newStartY = 0;
            newEndY = newStartY + newYLen;
        }

        if (newEndX > this.state.imgWidth) {
            newStartX = this.state.imgWidth - newXLen;
        }

        if (newEndY > this.state.imgHeight) {
            newStartY = this.state.imgHeight - newYLen;
        }

        return {
            newStartX: newStartX,
            newStartY: newStartY,
            newXLen: newXLen,
            newYLen: newYLen
        }
    }

    zoomIn() {
        let params = this.getZoomInParams(this.state.startX, this.state.startY);
        this.setZoomInState(params);
    }

    zoomInAndRelocate(x, y) {
        let relocateCoOrds = this.getNewCoOrdsByPreviewClick(x, y);
        let params = this.getZoomInParams(relocateCoOrds.newX, relocateCoOrds.newY);
        this.setZoomInState(params);
    }

    getZoomInParams(startX, startY) {
        let newXLen = this.state.xLen / 2;
        let newYLen = this.state.yLen / 2;
        let newStartX = startX + newXLen / 2;
        let newStartY = startY + newYLen / 2;
        if (newStartX < 0) {
            newStartX = 0;
        }
        if (newStartY < 0) {
            newStartY = 0;
        }
        let zoomInDisabled = this.state.xLen / 2 < this.state.imgTagWidth;
        return {
            xLen: newXLen,
            yLen: newYLen,
            startX: newStartX,
            startY: newStartY,
            zoomInDisabled: zoomInDisabled
        }
    }

    setZoomInState(params) {
        this.setState({
            imageTileUrl: this.host + this.getTilePath + "/" + this.state.imageId + "/" + params.startX + "/" + params.xLen + "/" + params.startY + "/" + params.yLen,
            xLen: params.xLen,
            yLen: params.yLen,
            startX: params.startX,
            startY: params.startY,
            moveDistance: this.state.moveDistance / 2,
            zoomInDisabled: params.zoomInDisabled,
            zoomOutDisabled: false
        });
    }

    zoomOut() {
        let params = this.getZoomOutParams(this.state.startX, this.state.startY);
        this.setZoomOutState(params);
    }

    getZoomOutParams(startX, startY) {
        let newXLen = this.state.xLen * 2;
        let newYLen = this.state.yLen * 2;
        let newStartX = startX;
        let newStartY = startY;
        let zoomOutDisabled =
            this.state.xLen * 4 > this.state.imgWidth
            || this.state.yLen * 4 > this.state.imgHeight
            || this.state.xLen * 2 > this.maxImageSide
            || this.state.yLen * 2 > this.maxImageSide;
        if (newStartX + newXLen > this.state.imgWidth) {
            newStartX = this.state.imgWidth - newXLen;
        }
        if (newStartY + newYLen > this.state.imgHeight) {
            newStartY = this.state.imgHeight - newYLen;
        }
        newStartX = newStartX - this.state.xLen / 2;
        newStartY = newStartY - this.state.yLen / 2;
        if (newStartX < 0) {
            newStartX = 0
        }
        if (newStartY < 0) {
            newStartY = 0
        }
        return {
            xLen: newXLen,
            yLen: newYLen,
            startX: newStartX,
            startY: newStartY,
            zoomOutDisabled: zoomOutDisabled
        }
    }

    setZoomOutState(params) {
        this.setState({
            imageTileUrl: this.host + this.getTilePath + "/" + this.state.imageId + "/" + params.startX + "/" + params.xLen + "/" + params.startY + "/" + params.yLen,
            xLen: params.xLen,
            yLen: params.yLen,
            startX: params.startX,
            startY: params.startY,
            moveDistance: this.state.moveDistance * 2,
            zoomOutDisabled: params.zoomOutDisabled,
            zoomInDisabled: false
        });
    }

    switchImage(event) {
        let imageId = event.target.value;
        fetch( this.host + this.getPropsPath + "/" + imageId)
            .then(res => res.json())
            .then((data) => {
                this.setState({
                    imgWidth: data.width,
                    imgHeight: data.height,
                    title: data.title,
                    imageId: imageId,
                    imageLoaded: true
                })
                this.moveInDirection(0, 0);
                this.updatePreviewImage();
            })
            .catch(console.log)
    }

    updatePreviewImage() {
        fetch( this.host + this.getPreviewPath + "/" + this.state.imageId + "/" + this.state.previewSize)
            .then(res => res.blob())
            .then((resBlob => resBlob.arrayBuffer()))
            .then((data) => {
                let img = document.createElement("img");

                let blob = new Blob([data])
                let reader = new FileReader();
                let component = this;
                reader.onload = function(event){
                    let base64 = event.target.result;
                    img.src = base64;

                    img.onload = () => {
                        component.state.previewImage = img;
                        component.redrawPreview(component);
                    }
                };

                reader.readAsDataURL(blob);
            })
            .catch(console.log);
    }

    redrawPreview(component) {
        if (component.state.previewImage !== null && component.state.previewImage !== undefined) {
            let previewImg = component.state.previewImage;

            let canvas = component.previewCanvas.current;
            let ctx = canvas.getContext("2d");

            canvas.width = previewImg.width;
            canvas.height = previewImg.height;
            ctx.drawImage(previewImg, 0, 0);

            let x = Math.floor((component.state.startX / component.state.imgWidth) * previewImg.width);
            let y = Math.floor((component.state.startY / component.state.imgHeight) * previewImg.height);
            let w = Math.floor((component.state.xLen / component.state.imgWidth) * previewImg.width);
            let h = Math.floor((component.state.yLen / component.state.imgHeight) * previewImg.height);

            ctx.fillStyle = "rgba(44, 157, 255, 0.6)";
            ctx.fillRect(x, y, w, h);
        }
    }

    handleKeyDown(e) {
        if(e.keyCode === 38 || e.keyCode === 87) {
            this.moveInDirection(0, -1 * this.state.moveDistance);
            e.preventDefault();
        }
        if(e.keyCode === 40 || e.keyCode === 83) {
            this.moveInDirection(0, this.state.moveDistance);
            e.preventDefault();
        }
        if(e.keyCode === 37 || e.keyCode === 65) {
            this.moveInDirection(-1 * this.state.moveDistance, 0);
            e.preventDefault();
        }
        if(e.keyCode === 39 || e.keyCode === 68) {
            this.moveInDirection(this.state.moveDistance, 0);
            e.preventDefault();
        }
        if (e.keyCode === 107 || (e.shiftKey && e.keyCode == 187) && !this.state.zoomInDisabled) {
            this.zoomIn();
            e.preventDefault();
        }
        if(e.keyCode === 109 || e.keyCode === 189 && !this.state.zoomOutDisabled) {
            this.zoomOut();
            e.preventDefault();
        }
    }

    render() {
        let disableRight = this.state.startX + this.state.xLen >= this.state.imgWidth;
        let disableDown = this.state.startY + this.state.yLen >= this.state.imgHeight;
        let disableLeft = this.state.startX <= 0;
        let disableUp = this.state.startY <= 0;

        let availableImageElements = [];
        for (let availableImage of this.state.availableImages) {
            availableImageElements.push(
                e(
                    'option',
                    {value: availableImage.id},
                    availableImage.title
                )
            );
        }

        if (this.state.imageLoaded) {
            return [
                e(
                    'h3',
                    {},
                    this.state.title
                ),
                e(
                    'img',
                    {
                        src: this.state.imageTileUrl,
                        width: this.state.imgTagWidth,
                        onDoubleClick: () => this.handleImageDoubleClick()
                    }
                ),
                e(
                    'select',
                    {
                        value: this.state.imageId,
                        onChange: (event) => this.switchImage(event)
                    },
                    availableImageElements
                ),
                e(
                    'button',
                    {
                        onClick: () => this.moveInDirection(0, -1 * this.state.moveDistance),
                        disabled: disableUp
                    },
                    'Up'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.moveInDirection(0, this.state.moveDistance),
                        disabled: disableDown
                    },
                    'Down'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.moveInDirection(-1 * this.state.moveDistance, 0),
                        disabled: disableLeft
                    },
                    'Left'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.moveInDirection(this.state.moveDistance, 0),
                        disabled: disableRight
                    },
                    'Right'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.zoomOut(),
                        disabled: this.state.zoomOutDisabled,
                        class: "image-browser-zoom-btn",
                        alt: "Zoom Out"
                    },
                    '-'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.zoomIn(),
                        disabled: this.state.zoomInDisabled,
                        class: "image-browser-zoom-btn",
                        alt: "Zoom In"
                    },
                    '+'
                ),
                e("canvas", {
                    ref: this.previewCanvas,
                    title: "Click to move",
                    onClick: (e) => this.handlePreviewClick(e),
                    onDoubleClick: (e) => e.preventDefault(),
                    onKeyDown: (e) => this.handleKeyDown(e)
                })
            ];
        }
        return [];
    }

    componentDidUpdate() {
        this.redrawPreview(this);
    }
}

export default ImageTileBrowser;

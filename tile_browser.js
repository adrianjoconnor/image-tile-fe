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
            prevDeltaY: 0,
            pinchZoomDisable: false,
            previewHidden: false,
            zoomButtonsHidden: false,
            shortcutsHidden: true,
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
        document.addEventListener('wheel', this.handleTrackpadPinch.bind(this));
    }

    handleTrackpadPinch(e) {
        e.preventDefault();
        if (e.ctrlKey && !this.state.pinchZoomDisable) {
            if (((e.deltaY < 0 && this.state.prevDeltaY >= 0)
                || (e.deltaY < 0 && e.deltaY + this.state.prevDeltaY < -10))
                && !this.state.zoomInDisabled) {
                this.state.pinchZoomDisable = true;
                this.zoomIn();
                setTimeout(() => {this.state.pinchZoomDisable = false;}, 500);
            } else if (((e.deltaY > 0 && this.state.prevDeltaY <= 0)
                || (e.deltaY > 0 && e.deltaY - this.state.prevDeltaY > 10))
                && !this.state.zoomOutDisabled) {
                this.state.pinchZoomDisable = true;
                this.zoomOut();
                setTimeout(() => {this.state.pinchZoomDisable = false;}, 500);
            }
        }
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
            newStartX: Math.floor(newStartX),
            newStartY: Math.floor(newStartY),
            newXLen: Math.floor(newXLen),
            newYLen: Math.floor(newYLen)
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
            xLen: Math.floor(newXLen),
            yLen: Math.floor(newYLen),
            startX: Math.floor(newStartX),
            startY: Math.floor(newStartY),
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
            xLen: Math.floor(newXLen),
            yLen: Math.floor(newYLen),
            startX: Math.floor(newStartX),
            startY: Math.floor(newStartY),
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

    togglePreviewVisibility(e) {
        this.setState({previewHidden: !e.target.checked});
    }

    toggleZoomButtonVisibility(e) {
        this.setState({zoomButtonsHidden: !e.target.checked});
    }

    toggleShortcutsVisibility(e) {
        e.preventDefault();
        this.setState({shortcutsHidden: !this.state.shortcutsHidden});
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
                        component.redrawPreview();
                    }
                };

                reader.readAsDataURL(blob);
            })
            .catch(console.log);
    }

    redrawPreview() {
        if (this.state.previewImage !== null && this.state.previewImage !== undefined) {
            let previewImg = this.state.previewImage;

            let canvas = this.previewCanvas.current;
            let ctx = canvas.getContext("2d");

            canvas.width = previewImg.width;
            canvas.height = previewImg.height;
            ctx.drawImage(previewImg, 0, 0);

            let x = Math.floor((this.state.startX / this.state.imgWidth) * previewImg.width);
            let y = Math.floor((this.state.startY / this.state.imgHeight) * previewImg.height);
            let w = Math.floor((this.state.xLen / this.state.imgWidth) * previewImg.width);
            let h = Math.floor((this.state.yLen / this.state.imgHeight) * previewImg.height);

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
                    "div",
                    {
                        class: "zoom-buttons",
                        style: {
                            display: this.state.zoomButtonsHidden ? "none": ""
                        },
                    },
                    [
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
                        e(
                            'button',
                            {
                                onClick: () => this.zoomOut(),
                                disabled: this.state.zoomOutDisabled,
                                class: "image-browser-zoom-btn",
                                alt: "Zoom Out"
                            },
                            '-'
                        )
                    ]
                ),
                e("div",
                    {
                        class: "right-panel"
                    },
                    [
                        e(
                            'select',
                            {
                                value: this.state.imageId,
                                onChange: (event) => this.switchImage(event)
                            },
                            availableImageElements
                        ),
                        e(
                            "br",
                            {}
                        ),
                        e(
                            "div",
                            {
                                style: {
                                    position: "relative",
                                    width: "100%",
                                    "margin-bottom": "4em",
                                    "margin-top": "0.5em"
                                }
                            },
                            [
                                e(
                                    'button',
                                    {
                                        onClick: () => this.moveInDirection(0, -1 * this.state.moveDistance),
                                        disabled: disableUp,
                                        style: {
                                            position: "absolute",
                                            top: "0",
                                            left: "3.2em"
                                        }
                                    },
                                    '↑'
                                ),
                                e(
                                    'button',
                                    {
                                        onClick: () => this.moveInDirection(0, this.state.moveDistance),
                                        disabled: disableDown,
                                        style: {
                                            position: "absolute",
                                            top: "3.8em",
                                            left: "3.2em"
                                        }
                                    },
                                    '↓'
                                ),
                                e(
                                    'button',
                                    {
                                        onClick: () => this.moveInDirection(-1 * this.state.moveDistance, 0),
                                        disabled: disableLeft,
                                        style: {
                                            position: "absolute",
                                            top: "1.9em",
                                            left: "0"
                                        }
                                    },
                                    '←'
                                ),
                                e(
                                    'button',
                                    {
                                        onClick: () => this.moveInDirection(this.state.moveDistance, 0),
                                        disabled: disableRight,
                                        style: {
                                            position: "absolute",
                                            top: "1.9em",
                                            left: "6em"
                                        }
                                    },
                                    '→'
                                )
                            ]
                        ),
                        e(
                            "br",
                            {}
                        ),
                        e("label",
                            {
                                for: "show-preview-check"
                            },
                            "Show preview"
                        ),
                        e("input", {
                            type: "checkbox",
                            name: "show-preview-check",
                            checked: !this.state.previewHidden,
                            onChange: (e) => this.togglePreviewVisibility(e)
                        }),
                        e(
                            "br",
                            {}
                        ),
                        e("label",
                            {
                                for: "show-zoom-buttons-check"
                            },
                            "Show zoom buttons"
                        ),
                        e("input", {
                            type: "checkbox",
                            name: "show-zoom-buttons-check",
                            checked: !this.state.zoomButtonsHidden,
                            onChange: (e) => this.toggleZoomButtonVisibility(e)
                        }),
                        e(
                            "br",
                            {}
                        ),
                        e("span",
                            {
                                onClick: (e) => this.toggleShortcutsVisibility(e),
                                style: {
                                    "text-decoration": "underline"
                                }
                            },
                            "Keyboard shortcuts"
                        ),
                        e("div",
                            {
                                style: {
                                    display: this.state.shortcutsHidden ? "none": ""
                                },
                                class: "keyboard-shortcuts-panel"
                            },
                            [
                                e(
                                    "p",
                                    {},
                                    "↑, ↓, ←, → arrows: Move", e("br", null), "W, S, A, D: Move", e("br", null), "Numpad -/+: Zoom in/out", e("br", null), "-/+(Shift and =): Zoom in/out"
                                )
                            ]
                        )
                    ]
                ),
                e("canvas", {
                    ref: this.previewCanvas,
                    title: "Click to move",
                    style: {display: this.state.previewHidden ? "none": ""},
                    onClick: (e) => this.handlePreviewClick(e),
                    onDoubleClick: (e) => e.preventDefault(),
                    onKeyDown: (e) => this.handleKeyDown(e)
                })
            ];
        }
        return [];
    }

    componentDidUpdate() {
        this.redrawPreview();
    }
}

export default ImageTileBrowser;

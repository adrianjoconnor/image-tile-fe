'use strict';

const e = React.createElement;

const host = "http://localhost:8080";
const getTilePath = "/v1/image/getTile";
const availableImagesPath = "/v1/image/availableImages";
const getPropsPath = "/v1/image/props";

class TileBrowserContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startX: 0,
            startY: 0,
            xLen: 800,
            yLen: 600,
            title: "Loading...",
            availableImages: [],
            moveDistance: 350,
            imgWidth: 0,
            imgHeight: 0,
            imageId: 2,
            imageLoaded: false
        };
    }

    moveTile = (xMovement, yMovement) => {
        if (this.state.moveDistance > this.state.imgWidth) {
            this.state.startX = 0;
            xMovement = 0;
            this.state.xLen = this.state.imgWidth;
        }

        if (this.state.moveDistance > this.state.imgHeight) {
            this.state.startY = 0;
            yMovement = 0;
            this.state.yLen = this.state.imgHeight;
        }

        let newStartX = this.state.startX + xMovement;
        let newStartY = this.state.startY + yMovement;

        let newEndX = newStartX + this.state.xLen;
        let newEndY = newStartY + this.state.yLen;

        if (newStartX < 0) {
            newStartX = 0;
            newEndX = newStartX + this.state.xLen;
        }

        if (newStartY < 0) {
            newStartY = 0;
            newEndY = newStartY + this.state.yLen;
        }

        if (newEndX > this.state.imgWidth) {
            newStartX = this.state.imgWidth - this.state.xLen;
        }

        if (newEndY > this.state.imgHeight) {
            newStartY = this.state.imgHeight - this.state.yLen;
        }

        this.state.startX = newStartX;
        this.state.startY = newStartY;

        this.setState(
            {imageTileUrl: host + getTilePath + "/" + this.state.imageId + "/" + this.state.startX + "/" + this.state.xLen + "/" + this.state.startY + "/" + this.state.yLen}
        );
    };

    render() {
        let disableRight = this.state.startX + this.state.xLen >= this.state.imgWidth;
        let disableDown = this.state.startY + this.state.yLen >= this.state.imgHeight;
        let disableLeft = this.state.startX <= 0;
        let disableUp = this.state.startY <= 0;

        if (this.state.imageLoaded) {
            return [
                e(
                    'img',
                    {src: this.state.imageTileUrl}
                ),
                e(
                    'p',
                    {},
                    'Available images: ' + JSON.stringify(this.state.availableImages)
                ),
                e(
                    'button',
                    {
                        onClick: () => this.#moveTile(0, -1 * this.state.moveDistance),
                        disabled: disableUp
                    },
                    'Up'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.#moveTile(0, this.state.moveDistance),
                        disabled: disableDown
                    },
                    'Down'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.#moveTile(-1 * this.state.moveDistance, 0),
                        disabled: disableLeft
                    },
                    'Left'
                ),
                e(
                    'button',
                    {
                        onClick: () => this.#moveTile(this.state.moveDistance, 0),
                        disabled: disableRight
                    },
                    'Right'
                )];
        }
        return [];
    }

    componentDidMount() {
        this.setState({ imageTileUrl: "http://localhost:8080/v1/image/getTile/1/0/400/0/400" });



        fetch( host + availableImagesPath)
            .then(res => res.json())
            .then((data) => {
                this.setState({ availableImages: data })
                if (data.size === 0) {
                    throw new Error("No images available from server!");
                }
                let imageId = data[0].id;
                this.setState({imageId: imageId})

                fetch( host + getPropsPath + "/" + imageId)
                    .then(res => res.json())
                    .then((data) => {
                        this.setState({
                            imgWidth: data.width,
                            imgHeight: data.height,
                            imageLoaded: true
                        })
                    })
                    .catch(console.log)
            })
            .catch(console.log)
    }
}

const domContainer = document.querySelector('#tile_browser_container');
ReactDOM.render(e(TileBrowserContainer), domContainer);

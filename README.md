# image-tile-fe

Example frontend for map-tile-service.

## Usage

To checkout both, run the following command (requires maven):

`git clone https://github.com/adrianjoconnor/map-tile-service.git && git clone https://github.com/adrianjoconnor/image-tile-fe.git && cd map-tile-service && mvn clean install`

If maven completes successfully (Showing a "BUILD SUCCESS" message), then you can proceed to run the backend service:

`mvn spring-boot:run`

In a separate terminal, cd to the directory containing your copy of image-tile-fe:

`cd image-tile-fe`

run npm install (requires npm)

`npm install`

And then run this:
 
`npm run serve`

Then open your browser and go to http://localhost:8081 and it should all be running. Use +/- to zoom in/out and the arrow keys to move around.

/**
 * This project originated as a small homework assignment for Michael Gleicher's UW-Madison CS 559 - Graphics class, Spring of 2019; starter code was provided by Michael Gleicher.
 * Since then, it has been expanded considerably as a hobby project--(virtually) all of the starter code has been replaced/rewritten.
 * 
 * Written by Tim Pinkerton.
 */

 // @ts-check
/* jshint -W069, esversion:6 */


/**
 * This class represents the object which is the core of the entire program--the Boid.
 */
class Boid {
    /**
     * Life spans are implemented here in constructor--that is, boids determine their life span at creation.
     * If the "Limited Life Span" special setting is checked, then the boid will set this.life to the value of
     * the Life Span slider; if not, then it will set this.life = -1, to show that it lives forever.
     * 
     * @param {number} x    - initial X position
     * @param {number} y    - initial Y position
     * @param {number} vx   - initial X velocity
     * @param {number} vy   - initial Y velocity
     * @param {number} r    - r value (color)
     * @param {number} g    - g value (color)
     * @param {number} b    - b value (color)
     * @param {number} mass - counter to keep track of boid mass (in merge collision mode); affects boid size
     */
    constructor(x,y,vx,vy,r,g,b,mass=1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.r = r;
        this.g = g;
        this.b = b;
        this.mass = mass;
        
        //Done to enable color change upon collision
        this.collision = 0;

        //Done to implement life-spans, if selected
        this.life = -1;
        if (document.getElementById("lifeSpan") ) {
            this.life = document.getElementById("lifeSpan").value;
        }
    }

    /**
     * Helper function to initiate color change upon collision.
     * The value hardcoded below determines how many frames the boid stays color-changed for.
     * Note: Reproduction (collision <= 0) supercedes collision, in terms of color-state.
     */
    collide() {
        if (this.collision >= 0) {
            this.collision = 15;
        }
    }

    /**
     * Helper function to initiate color change upon reproduction collisions.
     * 
     * Note: 3 frames of the reproduction cooldown is "built-in" to the draw method below--for this brief time 
     * the Boid is still locked out of reproduction (collision < 0) but is displayed as white w/black border, 
     * in order to help the user distinguish between rapid subsequent reproduction events. Therefore, the cooldown 
     * must be greater than 3 frames--otherwise, the boid would appear to always be ineligible for mating. 
     * This is handled by the min value of the Satiation Cooldown slider input (currently 6).
     */
    reproduce() {
        let reproductionCooldown = document.getElementById("reproduction").value;
        this.collision = -reproductionCooldown;
    }

    /**
     * Draws the Boid, and displays Collision Radius and/or Neighborhood Radius, if selected.
     * Also updates this.collision, this.life, and any other frame-based countdowns.
     * 
     * Note: The "Monogamous Reproduction" setting is enforced here--if selected, no longer increment this.collision 
     * for boids after reproduction, rendering them permanently white w/black outline.
     * 
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        //Sqrt-based size multiplier--starts at 1 for mass=1 (default boid state), and increases in merge collision mode
        let sizeMult = Math.sqrt(this.mass);
        context.save();
        context.translate(this.x, this.y);
        context.rotate(Math.atan2(this.vy,this.vx) );
        context.fillStyle = `rgb(${this.r}, ${this.g}, ${this.b})`;
        context.strokeStyle = `rgb(${this.r}, ${this.g}, ${this.b})`;
        //Check for collision state--if needed, change color
        if (this.collision > 0) {
            context.fillStyle = "black";
            context.strokeStyle = "black";
            this.collision--;
        }
        //Check for reproduction state--special case for 0 > collision > -3, to increase visual clarity around rapid subsequent reproduction events
        if (this.collision < 0) {
            if (this.collision < -3) {
                context.fillStyle = "white";
                context.strokeStyle = "black";
            }
            //Check for Monogamous Reproduction mode
            if (document.getElementById("monogamy") ) {
                if (document.getElementById("monogamy").checked) {
                    //If checked, don't increment this.collision
                }
                else {
                    this.collision++;
                }
            }
            //In case checkbox for Monogamous Reproduction doesn't exist, but boids have recently reproduced
            else {
                this.collision++;
            }
        }
        //Update life state
        if (this.life > 0) {
            this.life--;
        }

        //Draw Boid
        context.beginPath();
        context.moveTo(sizeMult*6,0);
        context.lineTo(sizeMult*-5,sizeMult*5);
        context.lineTo(sizeMult*-2,0);
        context.lineTo(sizeMult*-5,sizeMult*-5);
        context.closePath();
        context.fill();
        context.stroke();

        //To visualize collision radius
        let collisionCircleOn = document.getElementById("showCollisionRadius").checked;
        if (collisionCircleOn) { 
            let collisionSlider = /** @type {HTMLInputElement} */ (document.getElementById("collisionRadius") );
            let collisionRadius = Number(collisionSlider.value);
            context.beginPath();
            context.ellipse(0,0,collisionRadius*sizeMult,collisionRadius*sizeMult,0,0,Math.PI*2);
            context.closePath();
            context.strokeStyle = "gray";
            context.stroke();
        }

        //To visualize neighborhood radius
        let neighborhoodCircleOn = document.getElementById("showNeighborhoodRadius").checked;
        if (neighborhoodCircleOn) {
            let neighborhoodSlider = /** @type {HTMLInputElement} */ (document.getElementById("neighborhood") );
            let neighborhoodRadius = Number(neighborhoodSlider.value);
            context.beginPath();
            context.ellipse(0,0,neighborhoodRadius,neighborhoodRadius,0,0,Math.PI*2);
            context.closePath();
            context.strokeStyle = "gray";
            context.setLineDash([3,12]);
            context.stroke();
        }

        context.restore();
    }

    /**
     * Perform the "steering" behavior for the Boid, depending on the Behavior settings chosen.
     * Note: In special mode Predator, the need to avoid the predators overrides Behavior settings (as long as a Predator is within neighborhood).
     * 
     * Note: Dealing with the boundaries is not handled here (there is no awareness of the canvas).
     * 
     * @param {Array<Boid>} flock - array of all Boids on the screen
     * @param {Array<Predator>} predators - array of all Predators on screen (if any)
     * @param {String} behaviorMode - describes the steering behavior of the boids
     * @param {String} collisionMode - describes the collision behavior of the boids
     * @param {String} specialMode - certain special modes which override the other settings
     * @param {CollisionCounter} collisionCounter - Obj that exists outside the boids, keeps track of boid-boid collisions
     * @param {ReproductionCounter} reproductionCounter - Obj that exists outside the boids, keeps track of reproduction events (special collisions, which spawn a new boid)
     * @param {PreyCounter} preyCounter - Obj that exists outside the boids, keeps track of boids preyed upon (in Predator special mode)
     */
    steer(flock, predators, behaviorMode, collisionMode, specialMode, collisionCounter, reproductionCounter) { 
        let neighborhoodSlider = /** @type {HTMLInputElement} */ (document.getElementById("neighborhood") );
        let neighborhoodRange = Number(neighborhoodSlider.value);
        let turnSpeedSlider = /** @type {HTMLInputElement} */ (document.getElementById("turnSpeed") );
        let turnSpeed = Number(turnSpeedSlider.value) * Math.PI/180;

        //Check if we are in special mode Predator
        if (specialMode.includes("specialPredator") ) {
            //Find any predators within this boid's neighborhood
            let threats = predators.filter(predator => {
                let distance = Math.sqrt( Math.pow(this.x-predator.x, 2) + Math.pow(this.y-predator.y, 2) );
                return distance < neighborhoodRange;
            } );
            //If there are predators in neighborhood, steer appropriately
            if (threats[0] != null) {
                //Find nearest predator
                threats.sort( (a,b) => {
                let distanceA = Math.sqrt( Math.pow(this.x-a.x, 2) + Math.pow(this.y-a.y, 2) );
                let distanceB = Math.sqrt( Math.pow(this.x-b.x, 2) + Math.pow(this.y-b.y, 2) );
                if (distanceA < distanceB){
                    return -1;
                }
                else if (distanceA > distanceB){
                    return 1;
                }
                else {
                    return 0;
                }
                } );

                //Get reference to nearest predator
                let repulse = threats[0];

                //Calculate new direction--away from nearest boid (within restraint of turn speed)
                let angle = Math.atan2(this.vy, this.vx);
                let newAngle = angle;
                let repulsedAngle = Math.atan2(this.y-repulse.y, this.x-repulse.x);

                //If nearly aligned with repulsedAngle, simply set to it (avoids oversteering) -- second condition below for when nearly aligned but on opposite sides of +X-axis
                if ( (Math.abs(repulsedAngle - angle) < turnSpeed) || (Math.abs(repulsedAngle - angle) > Math.PI*2 - turnSpeed) ) {
                    newAngle = repulsedAngle;
                }
                //If repulsedAngle - angle is between 0 and pi, or -2pi and -pi, then turn counterclockwise (increase angle)
                else if ( ( (repulsedAngle - angle < Math.PI) && (repulsedAngle - angle > 0) ) || (repulsedAngle - angle < -Math.PI) ) {
                    newAngle = angle + turnSpeed;
                }
                //If repulsedAngle - angle is between pi and 2pi, or -pi and 0, then turn clockwise (decrease angle)
                else if ( (repulsedAngle - angle >= Math.PI) || ( (repulsedAngle - angle <= 0) && (repulsedAngle - angle >= -Math.PI) ) ) {
                    newAngle = angle - turnSpeed;
                }

                //Update velocity--note, we go out of our way to not re-unitize it, so that merge collisions can work as intended
                let currSpeed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2) );
                this.vx = currSpeed * Math.cos(newAngle);
                this.vy = currSpeed * Math.sin(newAngle);
                
                //Handle collisions via helper function
                this.handleCollision(flock, collisionMode, collisionCounter, reproductionCounter);

                //Return now (to override normal behavior)
                return;
            }
            //If no predators in neighborhood, continue steering behavior as usual
        }

        //Ignore behaviorMode
        if (behaviorMode == "behaviorIgnore") {
            //No steering to do--just handle collisions via helper function
            this.handleCollision(flock, collisionMode, collisionCounter, reproductionCounter);
        }

        //Flocking behaviorMode
        else if (behaviorMode == "behaviorFlocking") {
            //Filter to just the boids within neighborhood range
            let neighbors = flock.filter(boid => {
                let distance = Math.sqrt( Math.pow(this.x-boid.x, 2) + Math.pow(this.y-boid.y, 2) );
                return distance < neighborhoodRange;
            });

            //Determine their avg angle/velocity
            let avgVX = 0;
            let avgVY = 0;
            neighbors.forEach(function(boid) {
                avgVX += boid.vx;
                avgVY += boid.vy;
            } );
            avgVX = avgVX/neighbors.length;
            avgVY = avgVY/neighbors.length;
            let avgAngle = Math.atan2(avgVY, avgVX);
            let angle = Math.atan2(this.vy, this.vx);

            //Calculate new angle/velocity of boid, within the restraint of the given turnSpeed (in degrees/frame)
            let newAngle = angle;
            //If nearly aligned with avgAngle, simply set to it (avoids oversteering) -- second condition below for when nearly aligned but on opposite sides of +X-axis
            if ( (Math.abs(avgAngle - angle) < turnSpeed) || (Math.abs(avgAngle - angle) > Math.PI*2 - turnSpeed) ) {
                newAngle = avgAngle;
            }
            //If avgAngle - angle is between 0 and pi, or -2pi and -pi, then turn counterclockwise (increase angle)
            else if ( ( (avgAngle - angle < Math.PI) && (avgAngle - angle > 0) ) || (avgAngle - angle < -Math.PI) ) {
                newAngle = angle + turnSpeed;
            }
            //If avgAngle - angle is between pi and 2pi, or -pi and 0, then turn clockwise (decrease angle)
            else if ( (avgAngle - angle >= Math.PI) || ( (avgAngle - angle <= 0) && (avgAngle - angle >= -Math.PI) ) ) {
                newAngle = angle - turnSpeed;
            }

            //Update velocity--note, we go out of our way to not re-unitize it, so that merge collisions can work as intended
            let currSpeed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2) );
            this.vx = currSpeed * Math.cos(newAngle);
            this.vy = currSpeed * Math.sin(newAngle);
            
            //Handle collisions via helper function
            this.handleCollision(flock, collisionMode, collisionCounter, reproductionCounter);
        }

        //Repulsion behaviorMode
        else if (behaviorMode == "behaviorRepulsion") {
            //Filter to just the boids within neighborhood range
            let neighbors = flock.filter(boid => {
                let distance = Math.sqrt( Math.pow(this.x-boid.x, 2) + Math.pow(this.y-boid.y, 2) );
                return distance < neighborhoodRange;
            });
            //Sort the neighbors by distance from this boid (note: may cause slow-downs when many boids on-screen!)
            neighbors.sort((a, b) => {
                let distanceA = Math.sqrt( Math.pow(this.x-a.x, 2) + Math.pow(this.y-a.y, 2) );
                let distanceB = Math.sqrt( Math.pow(this.x-b.x, 2) + Math.pow(this.y-b.y, 2) );
                if (distanceA < distanceB){
                    return -1;
                }
                else if (distanceA > distanceB){
                    return 1;
                }
                else {
                    return 0;
                }
            });
            //Get reference to nearest boid (note, index 1 to exclude this boid itself)
            let repulse = neighbors[1];

            //Calculate new direction--away from nearest boid (within restraint of turn speed)
            let angle = Math.atan2(this.vy, this.vx);
            let newAngle = angle;
            //Make sure there is a boid within neighborhood range
            if (repulse) {
                let repulsedAngle = Math.atan2(this.y-repulse.y, this.x-repulse.x);
                //If nearly aligned with repulsedAngle, simply set to it (avoids oversteering) -- second condition below for when nearly aligned but on opposite sides of +X-axis
                if ( (Math.abs(repulsedAngle - angle) < turnSpeed) || (Math.abs(repulsedAngle - angle) > Math.PI*2 - turnSpeed) ) {
                    newAngle = repulsedAngle;
                }
                //If repulsedAngle - angle is between 0 and pi, or -2pi and -pi, then turn counterclockwise (increase angle)
                else if ( ( (repulsedAngle - angle < Math.PI) && (repulsedAngle - angle > 0) ) || (repulsedAngle - angle < -Math.PI) ) {
                    newAngle = angle + turnSpeed;
                }
                //If repulsedAngle - angle is between pi and 2pi, or -pi and 0, then turn clockwise (decrease angle)
                else if ( (repulsedAngle - angle >= Math.PI) || ( (repulsedAngle - angle <= 0) && (repulsedAngle - angle >= -Math.PI) ) ) {
                    newAngle = angle - turnSpeed;
                }
            }

            //Update velocity--note, we go out of our way to not re-unitize it, so that merge collisions can work as intended
            let currSpeed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2) );
            this.vx = currSpeed * Math.cos(newAngle);
            this.vy = currSpeed * Math.sin(newAngle);
            
            //Handle collisions via helper function--note, this is kind of wasteful since we've already sorted the flock by proximity, and are now filtering it again
            this.handleCollision(flock, collisionMode, collisionCounter, reproductionCounter);
        }

        //Attraction behaviorMode
        else if (behaviorMode == "behaviorAttraction") {
            //Filter to just the boids within neighborhood range
            let neighbors = flock.filter(boid => {
                let distance = Math.sqrt( Math.pow(this.x-boid.x, 2) + Math.pow(this.y-boid.y, 2) );
                return distance < neighborhoodRange;
            });
            //Sort the neighbors by distance from this boid (note: may cause slow-downs when many boids on-screen!)
            neighbors.sort((a, b) => {
                let distanceA = Math.sqrt( Math.pow(this.x-a.x, 2) + Math.pow(this.y-a.y, 2) );
                let distanceB = Math.sqrt( Math.pow(this.x-b.x, 2) + Math.pow(this.y-b.y, 2) );
                if (distanceA < distanceB){
                    return -1;
                }
                else if (distanceA > distanceB){
                    return 1;
                }
                else {
                    return 0;
                }
            });
            //Get reference to nearest boid (note, index 1 to exclude this boid itself)
            let attract = neighbors[1];

            //Calculate new direction--towards nearest boid (within restraint of turn speed)
            let angle = Math.atan2(this.vy, this.vx);
            let newAngle = angle;
            //Make sure there is a boid within neighborhood range
            if (attract) {
                let attractedAngle = Math.atan2(attract.y-this.y, attract.x-this.x);
                //If nearly aligned with attractdAngle, simply set to it (avoids oversteering) -- second condition below for when nearly aligned but on opposite sides of +X-axis
                if ( (Math.abs(attractedAngle - angle) < turnSpeed) || (Math.abs(attractedAngle - angle) > Math.PI*2 - turnSpeed) ) {
                    newAngle = attractedAngle;
                }
                //If attractdAngle - angle is between 0 and pi, or -2pi and -pi, then turn counterclockwise (increase angle)
                else if ( ( (attractedAngle - angle < Math.PI) && (attractedAngle - angle > 0) ) || (attractedAngle - angle < -Math.PI) ) {
                    newAngle = angle + turnSpeed;
                }
                //If attractdAngle - angle is between pi and 2pi, or -pi and 0, then turn clockwise (decrease angle)
                else if ( (attractedAngle - angle >= Math.PI) || ( (attractedAngle - angle <= 0) && (attractedAngle - angle >= -Math.PI) ) ) {
                    newAngle = angle - turnSpeed;
                }
            }

            //Update velocity--note, we go out of our way to not re-unitize it, so that merge collisions can work as intended
            let currSpeed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2) );
            this.vx = currSpeed * Math.cos(newAngle);
            this.vy = currSpeed * Math.sin(newAngle);
            
            //Handle collisions via helper function--note, this is kind of wasteful since we've already sorted the flock by proximity, and are now filtering it again
            this.handleCollision(flock, collisionMode, collisionCounter, reproductionCounter);
        }
        
    }

    /**
     * Helper function (called by steer() ) to check for and handle boid-boid collisions, depending on the mode set by user.
     * Note: Collisions are assumed to always occur between two boids--if more than one boid is within the collisionRadius of "this" boid,
     *          only the collision with the first one (that is, the one that occurs first in the flock array) is dealt with here.
     *          However, in these rare cases each additional boid will be checking for their own collisions, so no collision goes unaccounted for.
     * Note: This function is somewhat redundant--despite generally handling both sides of the collision, 
     *         it will always be called for both parties anyways (since both boids have their steer() called).
     *         Hence, the collisionCounter object knows to divide the count by 2 (to correct for double-counting collisions).
     * 
     * @param {Boid[]} flock - array of all Boids on the screen
     * @param {String} collisionMode - describes the collision behavior of the boids
     * @param {CollisionCounter} collisionCounter - Obj that exists outside the boids, keeps track of boid-boid collisions
     * @param {ReproductionCounter} reproductionCounter - Obj that exists outside the boids, keeps track of reproduction events (special collisions, which spawn a new boid)
     */
    handleCollision(flock, collisionMode, collisionCounter, reproductionCounter) {
        let collisionSlider = /** @type {HTMLInputElement} */ (document.getElementById("collisionRadius") );
        let collisionRadius = Number(collisionSlider.value);

        //Ignore collisionMode
        if (collisionMode == "collisionIgnore") {
            //Return now and avoid any work otherwise done
            return;
        }

        //Check for boid-boid collisions--note that we also filter out any boids with identical position (they are in fact the same boid)
        //Note: We correct for the size multiplier, so that merge mode works right
        let sizeMult = Math.sqrt(this.mass);
        let collided = flock.filter( boid => {
            let distance = Math.sqrt( Math.pow(this.x-boid.x, 2) + Math.pow(this.y-boid.y, 2) );
            return (distance < (collisionRadius*sizeMult + collisionRadius*Math.sqrt(boid.mass)) ) && (distance != 0);
        } );

         //Collide collisionMode
         if (collisionMode == "collisionCollide") {
            //Check for a collision
            if (collided[0] ) {
                let newAngle = Math.atan2(this.y-collided[0].y, this.x-collided[0].x);
                this.vx = Math.cos(newAngle);
                this.vy = Math.sin(newAngle);
                collided[0].vx = -Math.cos(newAngle);
                collided[0].vy = -Math.sin(newAngle);                
                collided[0].collide();
                this.collide();                
                //Update collisionCounter
                collisionCounter.updateCount();
            }
        }
        
        //Merge collisionMode
        if (collisionMode == "collisionMerge") {
            //First, check if any collisions were detected
            if (collided[0] ) {
                //Find index of this boid in flock
                let currBoidIndex = flock.indexOf(this);
                //Find index of secondary colliding boid
                let secondaryBoidIndex = flock.indexOf(collided[0] );
                //Check if both colliding boids were found by index in the flock--if not, we can't remove them (and also, why couldn't we find them???)
                if (currBoidIndex > -1 && secondaryBoidIndex > -1) {
                    let currBoid = flock[currBoidIndex];
                    let secondaryBoid = flock[secondaryBoidIndex];
                    //Calculate properties of new boid: mass is added; color is averaged; positions are a mass-weighted average; and velocities are a mass-weighted sum (sort of)
                    let massNew = (currBoid.mass + secondaryBoid.mass);
                    let massOld = Math.max(currBoid.mass, secondaryBoid.mass);
                    let rNew = (currBoid.r + secondaryBoid.r) / 2;
                    let gNew = (currBoid.g + secondaryBoid.g) / 2;
                    let bNew = (currBoid.b + secondaryBoid.b) / 2;
                    let xNew = (currBoid.x*currBoid.mass + secondaryBoid.x*secondaryBoid.mass) / massNew;
                    let yNew = (currBoid.y*currBoid.mass + secondaryBoid.y*secondaryBoid.mass) / massNew;
                    let vxNew = (currBoid.vx*currBoid.mass + secondaryBoid.vx*secondaryBoid.mass) / massOld;
                    let vyNew = (currBoid.vy*currBoid.mass + secondaryBoid.vy*secondaryBoid.mass) / massOld;
                    //Remove them from the flock
                    flock.splice(currBoidIndex, 1);
                    //Update secondaryBoidIndex, if it got shifted back by removing currBoid
                    if (currBoidIndex < secondaryBoidIndex) secondaryBoidIndex--;
                    flock.splice(secondaryBoidIndex, 1);
                    //Add a new boid with the avg'd stats
                    flock.push(new Boid(xNew, yNew, vxNew, vyNew, rNew, gNew, bNew, massNew) );
                    //Update collisionCounter
                    //Note, this is a case where collisions aren't double-counted (the other boid has been deleted), so manually double-count it for consistency
                    collisionCounter.updateCount();
                    collisionCounter.updateCount();
                } 
                else throw new Error("Boids from collided[] not found in flock[]--this should not be possible, something has gone wrong!");
            }
        }

        //Reproduce collisonMode -- NOTE: Reproductions have a "cooldown" period, as dictated by the parents "collision" state
        if (collisionMode == "collisionReproduce") {
            //First, check if any collisions were detected
            if (collided[0] ) {
                //Try to find eligible coupling
                let eligibleCoupleFound = false;
                reproduction:
                for (let i = 0; i < collided.length; i++) {
                    //If eligible, perform reproduction according to the "Brood Size" setting, and break out of loop
                    if (this.collision == 0 && collided[i].collision == 0) {
                        //Find index of this boid in flock
                        let currBoidIndex = flock.indexOf(this);
                        //Find index of secondary colliding boid
                        let secondaryBoidIndex = flock.indexOf(collided[0] );
                        //Check if both colliding boids were found by index in the flock--if not, we can't remove them (and also, why couldn't we find them???)
                        if (currBoidIndex > -1 && secondaryBoidIndex > -1) {
                            let currBoid = flock[currBoidIndex];
                            let secondaryBoid = flock[secondaryBoidIndex];
                            
                            //Handle baby-making via helper method (below)
                            this.handleReproduction(flock, currBoid, secondaryBoid, reproductionCounter, collisionCounter);
                            
                            //Update boolean flag and break out of loop
                            eligibleCoupleFound = true;
                            break reproduction;
                        } 
                        else throw new Error("Boids from collided[] not found in flock[] during reproduction procedure--this should not be possible, something has gone wrong!");
                    }
                }
                //If no eligible couples found, deal with collision as usual
                if (eligibleCoupleFound == false) {
                    let newAngle = Math.atan2(this.y - collided[0].y, this.x - collided[0].x);
                    this.vx = Math.cos(newAngle);
                    this.vy = Math.sin(newAngle);
                    collided[0].vx = -Math.cos(newAngle);
                    collided[0].vy = -Math.sin(newAngle);
                    this.collide();
                    collided[0].collide();
                    collisionCounter.updateCount();
                }
            }
        }
    }

    /**
     * Helper function (called by handleCollision() ) to handle reproductive collisions. Creates a number of children dependent on the Brood Size setting.
     * 
     * @param {Array<Boid>} flock - array of all Boids on screen
     * @param {Boid} firstBoid - the first parent boid (also "this" boid)
     * @param {Boid} secondBoid - the second parent boid
     * @param {ReproductionCounter} reproductionCounter - obj that keeps track of reproductive collision events
     * @param {CollisionCounter} collisionCounter - obj that keeps track of normal boid-boid collision events
     */
    handleReproduction(flock, firstBoid, secondBoid, reproductionCounter, collisionCounter) {
        //Determine number of children
        let broodSize = document.getElementById("broodSize").value;
        //Get collision radius (for use below, in displacement of babies from parents)
        let collisionRadius = document.getElementById("collisionRadius").value;

        //Make babies
        for (let i = 0; i < broodSize; i++) {
            //Calculate properties of new boid: mass is default; r, g, b randomly interpolate between parents values; 
            //      positions are avg of parent positions, with an additional displacement up to +/- broodSize*collisionRadius; 
            //      velocity is away from avg of parent positions
            let rRand = Math.random();
            let rNew = firstBoid.r*rRand + secondBoid.r*(1-rRand);
            let gRand = Math.random();
            let gNew = firstBoid.g*gRand + secondBoid.g*(1-gRand);
            let bRand = Math.random();
            let bNew = firstBoid.b*bRand + secondBoid.b*(1-bRand);
            let xAvg = (firstBoid.x + secondBoid.x) / 2;
            let yAvg = (firstBoid.y + secondBoid.y) / 2;
            let xDelta = Math.random()*2*broodSize*collisionRadius - broodSize*collisionRadius;
            let yDelta = Math.random()*2*broodSize*collisionRadius - broodSize*collisionRadius;
            let xNew = xAvg + xDelta;
            let yNew = yAvg + yDelta;
            let direction = Math.atan2(xNew - xAvg, yNew - yAvg);
            let vxNew = Math.cos(direction);
            let vyNew = Math.sin(direction);                            
            
            let baby = new Boid(xNew, yNew, vxNew, vyNew, rNew, gNew, bNew);

            //Set baby to collided state, so that it can't immediately reproduce itself (both thematic, and necessary to avoid crashing with large brood size settings)
            baby.collide();
            //Add the new boid
            flock.push(baby);
        }

        //Handle collision between parents as usual (except for the color change difference, via helper methods)
        let newAngle = Math.atan2(firstBoid.y - secondBoid.y, firstBoid.x - secondBoid.x);
        firstBoid.vx = Math.cos(newAngle);
        firstBoid.vy = Math.sin(newAngle);
        secondBoid.vx = -Math.cos(newAngle);
        secondBoid.vy = -Math.sin(newAngle);
        firstBoid.reproduce();
        secondBoid.reproduce();
        //Update reproductionCounter
        reproductionCounter.updateCount();
        //Note--this is needed to counter-act the second parent detecting a normal collision between the pair
        collisionCounter.decrementCount();
    }

}


/**
 * This class is used only in the special mode Predator.
 * It is a sort of alternate boid, which hunts the boids and (if it catches them) deletes them.
 */
class Predator {
    
    /**
     * Predator constructor
     * 
     * @param {number} x    - initial X position
     * @param {number} y    - initial Y position
     * @param {number} vx   - initial X velocity
     * @param {number} vy   - initial Y velocity
     * @param {number} mass - counter to keep track of Predator mass
     */
    constructor(x,y,vx=1,vy=0,mass=9) {
        this.mass = mass;
        let sizeMult = Math.sqrt(mass);
        this.x = x;
        this.y = y;
        this.vx = sizeMult*vx;
        this.vy = sizeMult*vy;
        
        
        //Done to enable color change upon collision
        this.collision = 0;
    }

    /**
     * Helper function to initiate color change upon collision.
     * The value hardcoded below determines how many frames the boid stays color-changed for.
     * Note: Predation (collision <= 0) supercedes collision, in terms of color-state.
     */
    collide() {
        if (this.collision >= 0)
        this.collision = 15;
    }

    /**
     * Helper function to initiate color change upon predatory collisions (boid consumption).
     * 
     * Note: 3 frames of the satiation cooldown is "built-in" to the draw method below--for this brief time 
     * the Predator is still locked out of predation (collision < 0) but is displayed as white, in order to help
     * the user distinguish between rapid subsequent predation events. Therefore, the cooldown must be greater
     * than 3 frames--otherwise, the predator would never turn red. This is handled by the min value of the 
     * Satiation Cooldown slider input (currently 6).
     * 
     * @param {Boid} boid - the boid being preyed upon
     */
    preyUpon(boid) {
        let satiationCooldown = document.getElementById("predatorSatiation").value;
        this.collision = -satiationCooldown;
        //Update speed based on mass increase
        let newMass = this.mass + boid.mass;
        let sizeMultRatio = Math.sqrt(newMass) / Math.sqrt(this.mass);
        this.vx *= sizeMultRatio;
        this.vy *= sizeMultRatio;
        this.mass += boid.mass;
    }

    /**
     * Draw the Predator
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        //Sqrt-based size multiplier
        let sizeMult = Math.sqrt(this.mass);
        context.save();
        context.translate(this.x, this.y);
        context.rotate(Math.atan2(this.vy,this.vx) );
        context.fillStyle = "white";
        context.strokeStyle = "black";
        //Check for collision--if needed, change color
        if (this.collision > 0) {
            context.fillStyle = "black";
            context.strokeStyle = "black";
            this.collision--;
        }
        //Used for predatory-collisions -- Note: Special case for -3 < collision < 0, to avoid constant red-state in saturated prey environment (visual clarity)
        if (this.collision < 0) {
            if (this.collision < -3) {
                context.fillStyle = "darkred";
                context.strokeStyle = "black"; 
            }
            this.collision++;
        }
        //Draw body
        context.beginPath();
        context.moveTo(sizeMult*7,sizeMult*2);
        context.lineTo(0,0);
        context.lineTo(sizeMult*7,sizeMult*-2);
        context.lineTo(sizeMult*-2,sizeMult*-5);
        context.lineTo(sizeMult*-6,0);
        context.lineTo(sizeMult*-2,sizeMult*5);
        context.closePath();
        context.fill();
        context.stroke();

        //To visualize collision radius
        let collisionCircleOn = document.getElementById("showCollisionRadius").checked;
        if (collisionCircleOn) { 
            let collisionSlider = /** @type {HTMLInputElement} */ (document.getElementById("predatorCollisionRadius") );
            let collisionRadius = Number(collisionSlider.value);
            context.beginPath();
            context.ellipse(0,0,collisionRadius*sizeMult,collisionRadius*sizeMult,0,0,Math.PI*2);
            context.closePath();
            context.strokeStyle = "gray";
            context.stroke();
        }

        //To visualize neighborhood radius
        let neighborhoodCircleOn = document.getElementById("showNeighborhoodRadius").checked;
        if (neighborhoodCircleOn) {
            let neighborhoodSlider = /** @type {HTMLInputElement} */ (document.getElementById("predatorNeighborhood") );
            let neighborhoodRadius = Number(neighborhoodSlider.value);
            context.beginPath();
            context.ellipse(0,0,neighborhoodRadius,neighborhoodRadius,0,0,Math.PI*2);
            context.closePath();
            context.strokeStyle = "gray";
            context.setLineDash([3,12]);
            context.stroke();
        }

        context.restore();
    }
    
    /**
     * Perform the "steering" behavior for the Predator - simple attraction to nearest boid
     * 
     * @param {Array<Boid>} boids - array of all Boids on screen
     * @param {Array<Predator>} predators - array of all predators on screen
     * @param {String} specialMode - the special setting modes--such as "specialPredator" mode
     * @param {PreyCounter} preyCounter - obj to keep track of Boids consumed by predators
     */
    steer(boids, predators, specialMode, preyCounter) {
        let neighborhoodSlider = /** @type {HTMLInputElement} */ (document.getElementById("predatorNeighborhood") );
        let neighborhoodRange = Number(neighborhoodSlider.value);
        let turnSpeedSlider = /** @type {HTMLInputElement} */ (document.getElementById("predatorTurnSpeed") );
        let turnSpeed = Number(turnSpeedSlider.value) * Math.PI/180;

        //Filter to just the boids within neighborhood range
        let neighbors = boids.filter(boid => {
            let distance = Math.sqrt( Math.pow(this.x-boid.x, 2) + Math.pow(this.y-boid.y, 2) );
            return distance < neighborhoodRange;
        });
        //Sort the neighbors by distance from this boid (note: may cause slow-downs when many boids on-screen!)
        let sorted = neighbors.sort((a, b) => {
            let distanceA = Math.sqrt( Math.pow(this.x-a.x, 2) + Math.pow(this.y-a.y, 2) );
            let distanceB = Math.sqrt( Math.pow(this.x-b.x, 2) + Math.pow(this.y-b.y, 2) );
            if (distanceA < distanceB){
                return -1;
            }
            else if (distanceA > distanceB){
                return 1;
            }
            else {
                return 0;
            }
        });
        //Get reference to nearest boid
        let repulse = sorted[0];

        //Calculate new direction--towards nearest boid (within restraint of turn speed)
        let angle = Math.atan2(this.vy, this.vx);
        let newAngle = angle;
        //Make sure there is a boid within neighborhood range--if not, newAngle is just the previous orientation
        if (repulse) {
            let attractAngle = Math.atan2(repulse.y-this.y, repulse.x-this.x);
            //If nearly aligned with repulsedAngle, simply set to it (avoids oversteering)
            if (Math.abs(attractAngle - angle) < turnSpeed) {
                newAngle = attractAngle;
            }
            //If attractAngle - angle is between 0 and pi, or -2pi and -pi, then turn counterclockwise (increase angle)
            else if ( ( (attractAngle - angle < Math.PI) && (attractAngle - angle > 0) ) || (attractAngle - angle < -Math.PI) ) {
                newAngle = angle + turnSpeed;
            }
            //If attractAngle - angle is between pi and 2pi, or -pi and 0, then turn clockwise (decrease angle)
            else if ( (attractAngle - angle >= Math.PI) || ( (attractAngle - angle <= 0) && (attractAngle - angle >= -Math.PI) ) ) {
                newAngle = angle - turnSpeed;
            }
        }

        //Update velocity--note, we go out of our way to not re-unitize it, so that merge collisions can work as intended
        let currSpeed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2) );
        this.vx = currSpeed * Math.cos(newAngle);
        this.vy = currSpeed * Math.sin(newAngle);
        
        //Handle collisions via helper method
        this.handleCollision(boids, predators, specialMode, preyCounter);
    }

    /**
     * Helper function (called by steer() ) to check for and handle collisions, depending on the mode set by user.
     * 
     * @param {Array<Boid>} boids - array of all Boids on the screen
     * @param {Array<Predator>} predators - array of all Predators on screen
     * @param {String} specialMode - the special setting modes--such as "specialPredator" mode
     * @param {PreyCounter} preyCounter - obj that keeps track of predation events
     */
    handleCollision(boids, predators, specialMode, preyCounter) {
        let collisionSlider = /** @type {HTMLInputElement} */ (document.getElementById("predatorCollisionRadius") );
        let collisionRadius = Number(collisionSlider.value);
        let sizeMult = Math.sqrt(this.mass);

        //Check for predator-predator collisions 
        let collided = predators.filter( predator => {
            let distance = Math.sqrt(Math.pow(predator.x-this.x, 2) + Math.pow(predator.y-this.y, 2) );
            return (distance < (collisionRadius*sizeMult + collisionRadius*Math.sqrt(predator.mass)) ) && (distance != 0);
        } );
        //Handle predator-predator collisions, if any
        if (collided[0] ) {
            let newAngle = Math.atan2(this.y-collided[0].y, this.x-collided[0].x);
            let currSpeed = Math.sqrt(Math.pow(this.vx,2) + Math.pow(this.vy,2) );
            this.vx = currSpeed*Math.cos(newAngle);
            this.vy = currSpeed*Math.sin(newAngle);
            let otherSpeed = Math.sqrt(Math.pow(collided[0].vx,2) + Math.pow(collided[0].vy,2) );
            collided[0].vx = otherSpeed*-Math.cos(newAngle);
            collided[0].vy = otherSpeed*-Math.sin(newAngle);                
            collided[0].collide();
            this.collide();
        }
        
        //Check for predator-boid collisions
        let boidCollisionRadius = document.getElementById("collisionRadius").value;
        let prey = boids.filter( boid => {
            let distance = Math.sqrt(Math.pow(boid.x-this.x, 2) + Math.pow(boid.y-this.y, 2) );
            return (distance < (collisionRadius*sizeMult + boidCollisionRadius*Math.sqrt(boid.mass)) );
        } );
        //Handle predator-boid collisions, if any
        if (prey[0] ) {
            //Check for satiation (cooldown period for eating boids)
            if (this.collision >= 0) {
                //Find prey boid in array of all boids
                let preyIndex = boids.indexOf(prey[0] );
                //Make sure the prey boid was found in array of all boids
                if (preyIndex > -1) {
                    boids.splice(preyIndex, 1);
                    this.preyUpon(prey[0] );
                    preyCounter.updateCount();
                }
                else throw new Error("Boid from prey[] not found in boids[]--this should not be possible, something has gone wrong!");
            }
        }
    }
}


/**
 * This class is used only in the special mode Teleporter.
 * It is a sort of alternate boid, which wanders the screen and (upon collision) teleports both Boids and Predators to a random location.
 */
class Teleporter {
    
    /**
     * Teleporter constructor
     * 
     * @param {number} x    - initial X position
     * @param {number} y    - initial Y position
     * @param {number} vx   - initial X velocity
     * @param {number} vy   - initial Y velocity
     * @param {number} mx   - momentum in X direction
     * @param {number} my   - momentum in Y direction
     */
    constructor(x,y,vx=0,vy=0,mx,my) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mx = mx;
        this.my = my;
          
        //Done to enable color change upon collision
        this.collision = 0;
    }

    /**
     * Helper function to initiate color change upon collision.
     * The value hardcoded below determines how many frames the Teleporter stays color-changed for.
     */
    collide() {
        if (this.collision >= 0)
        this.collision = 15;
    }

    /**
     * Helper function to initiate color change upon teleportation-based collision.
     * 
     * Note: 3 frames of the teleport cooldown is "built-in" to the draw method below--for this brief time 
     * the Teleporter is still locked out of further teleportation (collision < 0) but is displayed as default, in order to help
     * the user distinguish between rapid subsequent teleportation events. Therefore, the cooldown must be greater
     * than 3 frames--otherwise, the teleporter might never turn color. This is handled by the min value of the 
     * Teleportation Cooldown slider input (currently 6).
     * 
     * @param {Predator, Boid} teleportee   - the teleported creature (Predator or Boid)     
     * @param {HTMLCanvasElement} canvas    - the canvas in which drawing context resides; passed in for location randomization (canvas.width, canvas.height) if needed
     */
    teleport(teleportee, canvas) {
        let teleportCooldown = document.getElementById("teleporterCooldown").value;
        this.collision = -teleportCooldown;
        //Send teleportee to random location
        teleportee.x = Math.random() * canvas.width;
        teleportee.y = Math.random() * canvas.height;
    }

    /**
     * Draw the Teleporter.
     * @param {CanvasRenderingContext2D} context 
     */
    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(Math.atan2(this.vy,this.vx) );
        context.fillStyle = "dark-gray";
        //Check for collision--if needed, change color
        if (this.collision > 0) {
            context.fillStyle = "black";
            this.collision--;
        }
        //Check for teleportation collision state--note, special case for 0 > collision > -3, to ensure visual clarity in case of rapid teleportations
        if (this.collision < 0) {
            if (this.collision < -3) {
                context.fillStyle = "purple";
            }
            this.collision++;
        }
        //Draw body
        context.beginPath();
        context.ellipse(0,0,20,20,0,0,Math.PI*2);
        context.closePath();
        context.fill();

        //To visualize collision radius
        let collisionCircleOn = document.getElementById("showCollisionRadius").checked;
        if (collisionCircleOn) { 
            let collisionSlider = /** @type {HTMLInputElement} */ (document.getElementById("teleporterCollisionRadius") );
            let collisionRadius = Number(collisionSlider.value);
            context.beginPath();
            context.ellipse(0,0,collisionRadius,collisionRadius,0,0,Math.PI*2);
            context.closePath();
            context.strokeStyle = "gray";
            context.stroke();
        }

        context.restore();
    }
    
    /**
     * Perform the "steering" behavior for the Teleporter--random drifting, with an attempt to simulate momentum
     * 
     * @param {Array<Boid>} boids               - array of all Boids on screen
     * @param {Array<Predator>} predators       - array of all Predators on screen 
     * @param {Array<Teleporter>} teleporters   - array of all Teleporters on screen
     * @param {String} specialMode              - string containing all specialModes enabled, concatenated together (no spaces)
     * @param {TeleportCounter} teleportCounter - obj to keep track of number of Boids/Predators teleported
     * @param {HTMLCanvasElement} canvas        - the canvas in which drawing context resides; passed in for location randomization (canvas.width, canvas.height) if needed
     */
    steer(boids, predators, teleporters, specialMode, teleportCounter, canvas) {
        let momentumSlider = /** @type {HTMLInputElement} */ (document.getElementById("teleporterMomentum") );
        let momentumScale = Number(momentumSlider.value);

        //Randomly generate accelerations (between -1 and 1) to modify the speed in both X and Y directions
        let ax = Math.random() * 2 - 1;
        let ay = Math.random() * 2 - 1;

        //Modify accelerations according to momentum and momentumScale (from Momentum slider), but keep them between -1 and 1
        ax += this.mx;
        if (ax >= 1) ax = 1;
        if (ax <= -1) ax = -1;
        ay += this.my;
        if (ay >= 1) ay = 1;
        if (ay <= -1) ay = -1;

        //Save old velocities, for use below in momentum updates
        let oldvx = this.vx;
        let oldvy = this.vy;

        //Update velocities, based on new accelerations (note: accelerations scaled by 100/momentumScale)
        this.vx += ax / momentumScale / 100;
        this.vy += ay / momentumScale / 100;
        //Enforce a cap on velocities
        let maxSpeed = document.getElementById("teleporterSpeed").value;
        if (Math.abs(this.vx) > 3) {
            this.vx = Math.sign(this.vx) * maxSpeed;
        }
        if (Math.abs(this.vy) > 3) {
            this.vy = Math.sign(this.vy) * maxSpeed;
        }

        //Update momentums--generally increase/decrease (toward opposition of velocity) by set amount; 
        //      when the sign of the corresponding velocity changes (not due to collision), reset momentum to +/- momentumScale as appropriate
        // x direction
        if (this.vx / oldvx <= 0) {
            this.mx = Math.sign(this.vx) * momentumScale;
        }
        else {
            this.mx -= Math.sign(this.vx) * momentumScale / 60;
        }
        // y direction
        if (this.vy / oldvy <= 0) {
            this.my = Math.sign(this.vy) * momentumScale;
        }
        else {
            this.mx -= Math.sign(this.vy) * momentumScale / 60;
        }
        
        //Handle collisions via helper method
        this.handleCollision(boids, predators, teleporters, specialMode, teleportCounter, canvas);
    }

    /**
     * Helper function (called by steer() ) to check for and handle collisions, depending on the mode set by user.
     * 
     * @param {Array<Boid>} boids               - array of all Boids on the screen
     * @param {Array<Predator>} predators       - array of all Predators on screen
     * @param {Array<Teleporter} teleporters    - array of all Teleporters on screen
     * @param {String} specialMode              - string containing all specialModes enabled, concatenated together (no spaces)
     * @param {PreyCounter} teleportCounter     - obj that keeps track of number of Boids/Predators teleported
     * @param {HTMLCanvasElement} canvas        - the canvas in which drawing context resides; passed in for location randomization (canvas.width, canvas.height) if needed
     */
    handleCollision(boids, predators, teleporters, specialMode, teleportCounter, canvas) {
        let collisionSlider = /** @type {HTMLInputElement} */ (document.getElementById("teleporterCollisionRadius") );
        let collisionRadius = Number(collisionSlider.value);

        //Check for teleporter-teleporter collisions 
        let collided = teleporters.filter( teleporter => {
            let distance = Math.sqrt(Math.pow(teleporter.x-this.x, 2) + Math.pow(teleporter.y-this.y, 2) );
            return (distance < 2*collisionRadius) && (distance != 0);
        } );
        //Handle teleporter-teleporter collisions, if any
        if (collided[0] ) {
            let newAngle = Math.atan2(this.y-collided[0].y, this.x-collided[0].x);
            let currSpeed = Math.sqrt(Math.pow(this.vx,2) + Math.pow(this.vy,2) );
            this.vx = currSpeed*Math.cos(newAngle);
            this.vy = currSpeed*Math.sin(newAngle);
            let otherSpeed = Math.sqrt(Math.pow(collided[0].vx,2) + Math.pow(collided[0].vy,2) );
            collided[0].vx = otherSpeed*-Math.cos(newAngle);
            collided[0].vy = otherSpeed*-Math.sin(newAngle);                
            collided[0].collide();
            this.collide();
        }
        
        if (specialMode.includes("specialPredator") ) {
            //Check for teleporter-predator collisions
            let predatorCollisionRadius = document.getElementById("predatorCollisionRadius").value;
            let teleportedPredators = predators.filter(predator => {
                let distance = Math.sqrt(Math.pow(predator.x - this.x, 2) + Math.pow(predator.y - this.y, 2));
                return (distance < (collisionRadius + predatorCollisionRadius*Math.sqrt(predator.mass)) );
            });
            //Handle teleporter-predator collisions, if any
            if (teleportedPredators[0]) {
                //Check for teleportation cooldown
                if (this.collision >= 0) {
                    //Find teleported predator in array of all predators
                    let targetIndex = predators.indexOf(teleportedPredators[0]);
                    //Make sure the target predator was found in array of all predators
                    if (targetIndex > -1) {
                        this.teleport(teleportedPredators[0], canvas);
                        teleportCounter.updateCount();
                    }
                    else throw new Error("Predator from teleportedPredators[] not found in predators[]--this should not be possible, something has gone wrong!");
                }
            }
        }  

        //Check for teleporter-boid collisions
        let boidCollisionRadius = document.getElementById("collisionRadius").value;
        let teleportedBoids = boids.filter(boid => {
            let distance = Math.sqrt(Math.pow(boid.x - this.x, 2) + Math.pow(boid.y - this.y, 2));
            return (distance < (collisionRadius + boidCollisionRadius*Math.sqrt(boid.mass) ) );
        });
        //Handle teleporter-boid collisions, if any
        if (teleportedBoids[0]) {
            //Check for teleportation cooldown
            if (this.collision >= 0) {
                //Find teleported boid in array of all boids
                let targetIndex = boids.indexOf(teleportedBoids[0]);
                //Make sure the target boid was found in array of all boids
                if (targetIndex > -1) {
                    this.teleport(teleportedBoids[0], canvas);
                    teleportCounter.updateCount();
                }
                else throw new Error("Boid from teleportedBoids[] not found in boids[]--this should not be possible, something has gone wrong!");
            }
        }
    }
}


//Set-up counter for boid collisions--has to be an object so that it can be passed to boid methods as a reference (rather than a simple value)
class CollisionCounter {
    constructor() {
        this.count = 0;
    }
    updateCount() {
        this.count++;
    }
    //Note: This is only used in reproduce mode, to counteract the second parent counting the reproduction as a standard collision
    decrementCount() {
        this.count--;
    }
    //Note: Halves the count, because each collision is double-reported (once from each boid)
    getCount() {
        return this.count/2;
    }
    resetCount() {
        this.count = 0;
    }
}

//Set-up counter for boid reproductions--has to be an object so that it can be passed as a reference, so that changes persist outside of functions
class ReproductionCounter {
    constructor() {
        this.count = 0;
    }
    updateCount() {
        this.count++;
    }
    //Note, since reproductions aren't double-reported, no need to fudge the count here as with collisions
    getCount() {
        return this.count;
    }
    resetCount() {
        this.count = 0;
    }
}

//Set-up counter for Predator special mode--has to be an object so that it can be passed to boid methods as a reference, so changes persist outside of functions
class PreyCounter {
    constructor() {
        this.count = 0;
    }
    updateCount() {
        this.count++;
    }
    getCount() {
        return this.count;
    }
    resetCount() {
        this.count = 0;
    }
}

//Set-up counter for Teleporter special mode--has to be an object so that it can be passed to boid methods as a reference, so changes persist outside of functions
class TeleportCounter {
    constructor() {
        this.count = 0;
    }
    updateCount() {
        this.count++;
    }
    getCount() {
        return this.count;
    }
    resetCount() {
        this.count = 0;
    }
}

/**
 * A little helper class to measure the average framerate (fps) over the last several frames.
 * 
 */
class FrameRateCounter {
    constructor() {
        //Array to hold the times between frames, in milliseconds
        this.frameTimes = [];
    }

    //Record a frame-time measurement
    recordTime(time) {
        this.frameTimes.push(time);
    }

    //Clear all frame-time measurements
    clearTimes() {
        this.frameTimes = [];
    }

    //Report the fps over current sampling of frame-times
    report() {
        let totalTime = 0;
        for (let i = 0; i < this.frameTimes.length; i++) {
            totalTime += this.frameTimes[i];
        }
        let avgTime = totalTime / 1000 / this.frameTimes.length;
        let fps = 1 / avgTime;
        return fps;
    }
}

window.onload = function() {
    /** @type Array<Boid> */
    let theBoids = [];
    /** @type Array<Predator> */
    let thePredators = [];
    /** @type Array<Teleporter> */
    let theTeleporters = [];

    let canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("canvas"));
    let context = canvas.getContext("2d");
    //Set canvas to more appropriate size--60% the width of document, but limit height to 95% of viewport height (leaving a lil room for margins)
    canvas.width = document.getElementById("root").clientWidth * 0.6;
    canvas.height = window.innerHeight * 0.95;

    //Make canvas resize, according to rules above, upon any window resize
    window.onresize = function() {
        canvas.width = document.getElementById("root").clientWidth * 0.6;
        canvas.height = window.innerHeight * 0.95;
    };

    //Default behavior mode (default checked radio box)
    let behaviorMode = "behaviorIgnore";
    //Default collision mode (default checked radio box)
    let collisionMode = "collisionIgnore";
    //Default special options mode (neither checkbox checked)
    let specialMode = "";

    //Set time on page load
    document.getElementById("timeSinceClear").value = new Date().toLocaleTimeString();

    let collisionCounter = new CollisionCounter();
    let reproductionCounter = new ReproductionCounter();
    let preyCounter = new PreyCounter();
    let teleportCounter = new TeleportCounter();

    //Create fps counter
    let fpsCounter = new FrameRateCounter();
    let prevTime, currTime;

    /**
     * Utility function, to bundle the drawing of everything into a single function call
     */
    function draw() {
        context.clearRect(0,0,canvas.width,canvas.height);
        theBoids.forEach(boid => boid.draw(context) );
        thePredators.forEach(predator => predator.draw(context) );
        theTeleporters.forEach(teleporter => teleporter.draw(context) );
    }

    //Create some initial boids
    rngenerateBoid();
    rngenerateBoid();
    rngenerateBoid();

    /**
     * Handle the adding/clearing buttons
     */
    document.getElementById("add1").onclick = function() {
        rngenerateBoid();
    };
    document.getElementById("add10").onclick = function() {
        for(let i = 0; i < 10; i++) {
            rngenerateBoid();
        }
    };
    document.getElementById("add100").onclick = function() {
        for(let i = 0; i < 100; i++) {
            rngenerateBoid();
        }
    };
    document.getElementById("add1000").onclick = function() {
        for(let i = 0; i < 1000; i++) {
            rngenerateBoid();
        }
    };
    document.getElementById("clear").onclick = function() {
        theBoids = [];
        thePredators = [];
        theTeleporters = [];
        collisionCounter.resetCount();
        reproductionCounter.resetCount();
        preyCounter.resetCount();
        teleportCounter.resetCount();
        document.getElementById("timeSinceClear").value = new Date().toLocaleTimeString();
    };

    /**
     * Handle the radio-button behavior options
     */
    this.document.getElementById("behaviorIgnore").onclick = function() {
        behaviorMode = "behaviorIgnore";
    };
    this.document.getElementById("behaviorFlocking").onclick = function() {
        behaviorMode = "behaviorFlocking";
    };
    this.document.getElementById("behaviorRepulsion").onclick = function() {
        behaviorMode = "behaviorRepulsion";
    };
    this.document.getElementById("behaviorAttraction").onclick = function() {
        behaviorMode = "behaviorAttraction";
    }

    /**
     * Handle the radio-button collision options
     */
    this.document.getElementById("collisionIgnore").onclick = function() {
        collisionMode = "collisionIgnore";
        //Remove counter for "Boid Reproductions", if it exists
        if (document.getElementById("boidReproductions") ) {
            let div = document.getElementById("boidPopulation").parentElement;
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove checkbox for "Monogamous Reproduction", if it exists
        if (document.getElementById("monogamy") ) {
            let div = document.getElementById("collisionOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove number input for "Brood Size", if it exists
        if (document.getElementById("broodSize") ) {
            let div = document.getElementById("collisionOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
        
        //Remove slider for "Reproductive Cooldown", if it exists
        if (document.getElementById("reproduction") ) {
            let div = document.getElementById("boidOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
    };

    this.document.getElementById("collisionCollide").onclick = function() {
        collisionMode = "collisionCollide";
        //Remove counter for "Boid Reproductions", if it exists
        if (document.getElementById("boidReproductions") ) {
            let div = document.getElementById("boidPopulation").parentElement;
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove checkbox for "Monogamous Reproduction", if it exists
        if (document.getElementById("monogamy") ) {
            let div = document.getElementById("collisionOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove number input for "Brood Size", if it exists
        if (document.getElementById("broodSize") ) {
            let div = document.getElementById("collisionOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove slider for "Reproductive Cooldown", if it exists
        if (document.getElementById("reproduction") ) {
            let div = document.getElementById("boidOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
    };

    this.document.getElementById("collisionMerge").onclick = function() {
        collisionMode = "collisionMerge";
        //Remove counter for "Boid Reproductions", if it exists
        if (document.getElementById("boidReproductions") ) {
            let div = document.getElementById("boidPopulation").parentElement;
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove checkbox for "Monogamous Reproduction", if it exists
        if (document.getElementById("monogamy") ) {
            let div = document.getElementById("collisionOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove number input for "Brood Size", if it exists
        if (document.getElementById("broodSize") ) {
            let div = document.getElementById("collisionOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
        //Remove slider for "Reproductive Cooldown", if it exists
        if (document.getElementById("reproduction") ) {
            let div = document.getElementById("boidOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
    };

    this.document.getElementById("collisionReproduce").onclick = function() {
        collisionMode = "collisionReproduce";
        //Create counter for "Boid Reproductions", if it doesn't already exist, and add it
        if (document.getElementById("boidReproductions") == null) {
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "text");
            newInput.setAttribute("readonly", "true");
            newInput.setAttribute("id", "boidReproductions");
            newInput.setAttribute("value", "0");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "boidReproductions");
            newLabel.innerHTML = "Boid Reproductions: ";
            document.getElementById("boidPopulation").parentElement.appendChild(document.createElement("br") );
            document.getElementById("boidPopulation").parentElement.appendChild(newLabel);
            document.getElementById("boidPopulation").parentElement.appendChild(newInput);
        }
        //Create number input and label for "Brood Size", if it doesn't already exist, and add it to the Collision Options div
        if (document.getElementById("broodSize") == null) {
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "number");
            newInput.setAttribute("id", "broodSize");
            newInput.setAttribute("min", "0");
            newInput.setAttribute("max", "10");
            newInput.setAttribute("step", "1");
            newInput.setAttribute("value", "1");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "broodSize");
            newLabel.setAttribute("style", "margin-left: 5em");
            newLabel.innerHTML = "Brood Size: ";
            let div = document.getElementById("collisionOptionsDiv");
            div.appendChild(document.createElement("br") );
            div.appendChild(newLabel);
            div.appendChild(newInput);
        }
        //Create slider and label for "Reproduction Cooldown", if it doesn't already exist, and add to Boid Options div
        if (document.getElementById("reproduction") == null) {
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "range");
            newInput.setAttribute("id", "reproduction");
            newInput.setAttribute("min", "6");
            newInput.setAttribute("max", "300");
            newInput.setAttribute("step", "6");
            newInput.setAttribute("value", "90");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "reproduction");
            newLabel.innerHTML = "Reproduction Cooldown";
            let boidOptionsDiv = document.getElementById("boidOptionsDiv");
            boidOptionsDiv.appendChild(document.createElement("br") );
            boidOptionsDiv.appendChild(newInput);
            boidOptionsDiv.appendChild(newLabel);
        }
        //Create check-box and label for "Monogamy", if it doesn't already exist, and add to Collision Options div
        if (document.getElementById("monogamy") == null) {
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "checkbox");
            newInput.setAttribute("id", "monogamy");
            newInput.setAttribute("style", "float:right");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "monogamy");
            newLabel.setAttribute("style", "float:right; margin-left:3em");
            newLabel.innerHTML = "Monogamous Reproduction";
            let collisionOptionsDiv = document.getElementById("collisionOptionsDiv");
            collisionOptionsDiv.appendChild(newInput);
            collisionOptionsDiv.appendChild(newLabel);
        }
    };

    /**
     * Handle the enabling/disabling of the Predator special mode
     */
    this.document.getElementById("specialPredator").onclick = function() {
        //Check whether we need to enable or disable
        if (document.getElementById("specialPredator").checked) {
            //Enable special mode Predator
            specialMode += "specialPredator";
            //Add a predator
            rngeneratePredator();

            //Create button to "Add Predator"
            let buttonAddPredator = document.createElement("button");
            buttonAddPredator.setAttribute("id", "addPredator");
            buttonAddPredator.setAttribute("value", "0");
            buttonAddPredator.innerHTML = "Add Predator";
            buttonAddPredator.onclick = rngeneratePredator;
            //Check if "Add Teleporter" button exists--if not, add this to a new line
            if (!document.getElementById("addTeleporter") ) {
                document.getElementById("add1").parentElement.appendChild(document.createElement("br"));
            }
            document.getElementById("add1").parentElement.appendChild(buttonAddPredator);

            //Create counter for "Boids Preyed Upon"
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "text");
            newInput.setAttribute("readonly", "true");
            newInput.setAttribute("id", "boidsPreyedUpon");
            newInput.setAttribute("value", "0");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "boidsPreyedUpon");
            newLabel.setAttribute("style", "margin-left: 1em");
            newLabel.innerHTML = "Boids Preyed Upon: ";
            document.getElementById("boidPopulation").parentElement.appendChild(document.createElement("br"));
            document.getElementById("boidPopulation").parentElement.appendChild(newLabel);
            document.getElementById("boidPopulation").parentElement.appendChild(newInput);

            //Create and add to DOM the predatorOptionsDiv
            let div = document.createElement("div");
            div.setAttribute("id", "predatorOptionsDiv");
            document.getElementById("uiCell").appendChild(div);
            //Create and add to div the heading at top of sliders
            let heading = document.createElement("h4");
            heading.innerHTML = "Predator Options";
            heading.setAttribute("class", "inputHeading");
            div.appendChild(heading);
            //Create and add to div the predatorSpeed slider, label, and line break
            let predatorSpeed = document.createElement("input");
            predatorSpeed.setAttribute("type", "range");
            predatorSpeed.setAttribute("id", "predatorSpeed");
            predatorSpeed.setAttribute("min", "0");
            predatorSpeed.setAttribute("max", "5");
            predatorSpeed.setAttribute("step", "0.1");
            predatorSpeed.setAttribute("value", "1");
            let predatorSpeedLabel = document.createElement("label");
            predatorSpeedLabel.innerHTML = "Speed";
            predatorSpeedLabel.setAttribute("for", "predatorSpeed");
            div.appendChild(predatorSpeed);
            div.appendChild(predatorSpeedLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the predatorNeighborhood slider, label, and line break
            let predatorNeighborhood = document.createElement("input");
            predatorNeighborhood.setAttribute("type", "range");
            predatorNeighborhood.setAttribute("id", "predatorNeighborhood");
            predatorNeighborhood.setAttribute("min", "10");
            predatorNeighborhood.setAttribute("max", "400");
            predatorNeighborhood.setAttribute("step", "10");
            predatorNeighborhood.setAttribute("value", "200");
            let predatorNeighborhoodLabel = document.createElement("label");
            predatorNeighborhoodLabel.innerHTML = "Neighborhood Radius";
            predatorNeighborhoodLabel.setAttribute("for", "predatorNeighborhood");
            div.appendChild(predatorNeighborhood);
            div.appendChild(predatorNeighborhoodLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the predatorTurnSpeed slider, label, and line break
            let predatorTurnSpeed = document.createElement("input");
            predatorTurnSpeed.setAttribute("type", "range");
            predatorTurnSpeed.setAttribute("id", "predatorTurnSpeed");
            predatorTurnSpeed.setAttribute("min", "0");
            predatorTurnSpeed.setAttribute("max", "3");
            predatorTurnSpeed.setAttribute("step", "0.1");
            predatorTurnSpeed.setAttribute("value", "0.5");
            let predatorTurnSpeedLabel = document.createElement("label");
            predatorTurnSpeedLabel.innerHTML = "Turn Speed";
            predatorTurnSpeedLabel.setAttribute("for", "predatorTurnSpeed");
            div.appendChild(predatorTurnSpeed);
            div.appendChild(predatorTurnSpeedLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the predatorCollisionRadius slider, label, and line break
            let predatorCollisionRadius = document.createElement("input");
            predatorCollisionRadius.setAttribute("type", "range");
            predatorCollisionRadius.setAttribute("id", "predatorCollisionRadius");
            predatorCollisionRadius.setAttribute("min", "1");
            predatorCollisionRadius.setAttribute("max", "20");
            predatorCollisionRadius.setAttribute("step", "1");
            predatorCollisionRadius.setAttribute("value", "5");
            let predatorCollisionRadiusLabel = document.createElement("label");
            predatorCollisionRadiusLabel.innerHTML = "Collision Radius";
            predatorCollisionRadiusLabel.setAttribute("for", "predatorCollisionRadius");
            div.appendChild(predatorCollisionRadius);
            div.appendChild(predatorCollisionRadiusLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the predatorSatiation slider, label, and line break
            let predatorSatiation = document.createElement("input");
            predatorSatiation.setAttribute("type", "range");
            predatorSatiation.setAttribute("id", "predatorSatiation");
            predatorSatiation.setAttribute("min", "6");
            predatorSatiation.setAttribute("max", "300");
            predatorSatiation.setAttribute("step", "6");
            predatorSatiation.setAttribute("value", "90");
            let predatorSatiationLabel = document.createElement("label");
            predatorSatiationLabel.innerHTML = "Satiation Cooldown";
            predatorSatiationLabel.setAttribute("for", "predatorSatiation");
            div.appendChild(predatorSatiation);
            div.appendChild(predatorSatiationLabel);
            div.appendChild(document.createElement("br"));
        }
        else {
            //Remove counter for "Boids Preyed Upon"
            let inputBoidsPreyedUpon = document.getElementById("boidsPreyedUpon");
            inputBoidsPreyedUpon.parentNode.removeChild(inputBoidsPreyedUpon.previousSibling);
            inputBoidsPreyedUpon.parentNode.removeChild(inputBoidsPreyedUpon.previousSibling);
            inputBoidsPreyedUpon.parentNode.removeChild(inputBoidsPreyedUpon);

            //Remove button for "Add Predator"
            let addPredator = document.getElementById("addPredator");
            //Only remove previous sibling (line break) if this is only Special Mode activated
            if (specialMode == "specialPredator") {
                addPredator.parentNode.removeChild(addPredator.previousSibling);
            }
            addPredator.parentNode.removeChild(addPredator);

            //Remove div (including all sliders, labels, etc) for Predator Options
            let child = document.getElementById("predatorOptionsDiv");
            child.parentNode.removeChild(child);

            //Empty array of Predators, so they don't continue to appear on screen
            thePredators = [];
            
            //Disable special mode predator
            let index = specialMode.indexOf("specialPredator");
            if (index == 0) {
                //Slice off "specialPredator" at beginning (15 letters long)
                specialMode = specialMode.slice(15);
            }
            else {
                //Combine the slices from before and after "specialPredator"
                specialMode = specialMode.slice(0, index) + specialMode.slice(index + 15);
            }
        }
    };

    /**
     * Handle the enabling/disabling of the Teleporter special mode
     */
    this.document.getElementById("specialTeleporter").onclick = function() {
        //Check whether we need to enable or disable
        if (document.getElementById("specialTeleporter").checked) {
            //Enable special mode Teleporter
            specialMode += "specialTeleporter";

            //Add a Teleporter
            rngenerateTeleporter();

            //Create button to "Add Teleporter"
            let buttonAddTeleporter = document.createElement("button");
            buttonAddTeleporter.setAttribute("id", "addTeleporter");
            buttonAddTeleporter.setAttribute("value", "0");
            buttonAddTeleporter.innerHTML = "Add Teleporter";
            buttonAddTeleporter.onclick = rngenerateTeleporter;
            //Check if "Add Predator" button exists--if not, put this button on new line
            if (!document.getElementById("addPredator") ) {
                document.getElementById("add1").parentElement.appendChild(document.createElement("br"));
            }
            document.getElementById("add1").parentElement.appendChild(buttonAddTeleporter);

            //Create counter for "Teleportations"
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "text");
            newInput.setAttribute("readonly", "true");
            newInput.setAttribute("id", "teleportations");
            newInput.setAttribute("value", "0");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "teleportations");
            newLabel.setAttribute("style", "margin-left: 1em");
            newLabel.innerHTML = "Teleportations: ";
            document.getElementById("boidPopulation").parentElement.appendChild(document.createElement("br"));
            document.getElementById("boidPopulation").parentElement.appendChild(newLabel);
            document.getElementById("boidPopulation").parentElement.appendChild(newInput);

            //Create and add to DOM the teleporterOptionsDiv
            let div = document.createElement("div");
            div.setAttribute("id", "teleporterOptionsDiv");
            document.getElementById("uiCell").appendChild(div);
            //Create and add to div the heading at top of sliders
            let heading = document.createElement("h4");
            heading.innerHTML = "Teleporter Options";
            heading.setAttribute("class", "inputHeading");
            div.appendChild(heading);
            //Create and add to div the teleporterSpeed slider, label, and line break
            let teleporterSpeed = document.createElement("input");
            teleporterSpeed.setAttribute("type", "range");
            teleporterSpeed.setAttribute("id", "teleporterSpeed");
            teleporterSpeed.setAttribute("min", "0");
            teleporterSpeed.setAttribute("max", "5");
            teleporterSpeed.setAttribute("step", "0.1");
            teleporterSpeed.setAttribute("value", "1");
            let teleporterSpeedLabel = document.createElement("label");
            teleporterSpeedLabel.innerHTML = "Speed";
            teleporterSpeedLabel.setAttribute("for", "teleporterSpeed");
            div.appendChild(teleporterSpeed);
            div.appendChild(teleporterSpeedLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the teleporterMomentum slider, label, and line break
            let teleporterMomentum = document.createElement("input");
            teleporterMomentum.setAttribute("type", "range");
            teleporterMomentum.setAttribute("id", "teleporterMomentum");
            teleporterMomentum.setAttribute("min", "0.01");
            teleporterMomentum.setAttribute("max", "0.5");
            teleporterMomentum.setAttribute("step", "0.01");
            teleporterMomentum.setAttribute("value", "0.25");
            let teleporterMomentumLabel = document.createElement("label");
            teleporterMomentumLabel.innerHTML = "Momentum";
            teleporterMomentumLabel.setAttribute("for", "teleporterMomentum");
            div.appendChild(teleporterMomentum);
            div.appendChild(teleporterMomentumLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the teleporterCollisionRadius slider, label, and line break
            let teleporterCollisionRadius = document.createElement("input");
            teleporterCollisionRadius.setAttribute("type", "range");
            teleporterCollisionRadius.setAttribute("id", "teleporterCollisionRadius");
            teleporterCollisionRadius.setAttribute("min", "5");
            teleporterCollisionRadius.setAttribute("max", "50");
            teleporterCollisionRadius.setAttribute("step", "5");
            teleporterCollisionRadius.setAttribute("value", "20");
            let teleporterCollisionRadiusLabel = document.createElement("label");
            teleporterCollisionRadiusLabel.innerHTML = "Collision Radius";
            teleporterCollisionRadiusLabel.setAttribute("for", "teleporterCollisionRadius");
            div.appendChild(teleporterCollisionRadius);
            div.appendChild(teleporterCollisionRadiusLabel);
            div.appendChild(document.createElement("br"));
            //Create and add to div the teleporterCooldown slider, label, and line break
            let teleporterCooldown = document.createElement("input");
            teleporterCooldown.setAttribute("type", "range");
            teleporterCooldown.setAttribute("id", "teleporterCooldown");
            teleporterCooldown.setAttribute("min", "6");
            teleporterCooldown.setAttribute("max", "300");
            teleporterCooldown.setAttribute("step", "6");
            teleporterCooldown.setAttribute("value", "90");
            let teleporterCooldownLabel = document.createElement("label");
            teleporterCooldownLabel.innerHTML = "Teleportation Cooldown";
            teleporterCooldownLabel.setAttribute("for", "teleporterCooldown");
            div.appendChild(teleporterCooldown);
            div.appendChild(teleporterCooldownLabel);
            div.appendChild(document.createElement("br"));
        }
        else {
            //Remove counter for "Teleportations"
            let inputTeleportations = document.getElementById("teleportations");
            inputTeleportations.parentNode.removeChild(inputTeleportations.previousSibling);
            inputTeleportations.parentNode.removeChild(inputTeleportations.previousSibling);
            inputTeleportations.parentNode.removeChild(inputTeleportations);

            //Remove button for "Add Teleporter"
            let buttonAddTeleporter = document.getElementById("addTeleporter");
            //Only remove previous sibling (line break) if this is only Special Mode activated
            if (specialMode == "specialTeleporter") {
                buttonAddTeleporter.parentNode.removeChild(buttonAddTeleporter.previousSibling);
            }
            buttonAddTeleporter.parentNode.removeChild(buttonAddTeleporter);

            //Remove div (including all sliders, labels, etc) for Teleporter Options
            let child = document.getElementById("teleporterOptionsDiv");
            child.parentNode.removeChild(child);

            //Empty array of teleporters, so they don't continue to appear on screen
            theTeleporters = [];
            
            //Disable special mode Teleporter
            let index = specialMode.indexOf("specialTeleporter");
            if (index == 0) {
                //Slice off "specialTeleporter" at beginning (17 letters long)
                specialMode = specialMode.slice(17);
            }
            else {
                //Combine the slices from before and after "specialTeleporter"
                specialMode = specialMode.slice(0, index) + specialMode.slice(index + 17);
            }
        }
    };

    /**
     * Handle the enabling of Life Span special option (checkbox)
     */
    this.document.getElementById("limitedLifeSpan").onclick = function() {
        //Create and add Life Span slider and label, if they don't exist
        if (document.getElementById("lifeSpan") == null) {
            let newInput = document.createElement("input");
            newInput.setAttribute("type", "range");
            newInput.setAttribute("id", "lifeSpan");
            newInput.setAttribute("min", "60");
            newInput.setAttribute("max", "1800");
            newInput.setAttribute("step", "30");
            newInput.setAttribute("value", "300");
            let newLabel = document.createElement("label");
            newLabel.setAttribute("for", "lifeSpan");
            newLabel.innerHTML = "Life Span";
            let div = document.getElementById("boidOptionsDiv");
            div.appendChild(document.createElement("br") );
            div.appendChild(newInput);
            div.appendChild(newLabel);
        }
        //Otherwise, if they do exist already, remove them
        else {
            let div = document.getElementById("boidOptionsDiv");
            div.lastChild.remove();
            div.lastChild.remove();
            div.lastChild.remove();
        }
    };

    /**
     * Helper function to create Boids at random.
     */
    function rngenerateBoid() {
        //Randomly generate positions and angle (direction)
        let x = Math.random()*canvas.width;
        let y = Math.random()*canvas.height;
        let theta = Math.random()*Math.PI*2;
        let vx = Math.cos(theta);
        let vy = Math.sin(theta);
        //Done to insure brighter, non-white colors (black is reserved for following collisions)
        let r,g,b;
        do{
            r = Math.random()*255;
            g = Math.random()*255;
            b = Math.random()*255;
        } while ( (r > 150 && g > 150 && b > 150) || (r < 50 && g < 50 && b < 50) );
        //Create boid
        theBoids.push(new Boid(x,y,vx,vy,r,g,b) );
    }

    /**
     * Helper function to create Predators at random.
     */
    function rngeneratePredator() {
        //Randomly generates positions and angle (direction)
        let x = Math.random()*canvas.width;
        let y = Math.random()*canvas.height;
        let theta = Math.random()*Math.PI*2;
        let vx = Math.cos(theta);
        let vy = Math.sin(theta);
        //Create Predator
        thePredators.push(new Predator(x,y,vx,vy) );
    }

    /**
     * Helper function to create Teleporters at random.
     */
    function rngenerateTeleporter() {
        //Randomly generate positions and velocities
        let x = Math.random()*canvas.width;
        let y = Math.random()*canvas.height;
        let vx = Math.random() * 2 - 1;
        let vy = Math.random() * 2 -1;
        let mx, my;
        if (vx >= 0) mx = 1;
        else    mx = -1;
        if (vy >= 0) my = 1;
        else    my = -1;
        //Create Teleporter
        theTeleporters.push(new Teleporter(x,y,vx,vy,mx,my) );
    }

    /**
     * The Actual Execution
     */
    function loop() {
        // Handle Boids
        // check for end-of-life state
        theBoids.forEach(boid => {
            if (boid.life == 0) {
                let index = theBoids.indexOf(boid);
                theBoids.splice(index, 1);
            }
        } );
        // change directions
        theBoids.forEach(boid => boid.steer(theBoids, thePredators, behaviorMode, collisionMode, specialMode, collisionCounter, reproductionCounter) );
        // move forward
        let boidSpeed = document.getElementById("speed").value;
        theBoids.forEach(function(boid) {
            boid.x += boid.vx * boidSpeed;
            boid.y += boid.vy * boidSpeed;
        } );
        // make sure that we stay on the screen
        theBoids.forEach(function(boid) {
            if ( (boid.x >= canvas.width) && (boid.vx >= 0) ) {
                boid.vx = -boid.vx;
                boid.collide();
            }
            else if ( (boid.x <= 0) && (boid.vx <= 0) ) {
                boid.vx = -boid.vx;
                boid.collide();
            }
            if ( (boid.y >= canvas.height) && (boid.vy >= 0) ) {
                boid.vy = -boid.vy;
                boid.collide();
            }
            else if ( (boid.y <= 0) && (boid.vy <= 0) ) {
                boid.vy = -boid.vy;
                boid.collide();
            }
        } );
        // Handle predators, if needed
        if (specialMode.includes("specialPredator") ) {
            // change directions
            thePredators.forEach(predator => predator.steer(theBoids, thePredators, specialMode, preyCounter) );
            // move forward
            let predatorSpeed = document.getElementById("predatorSpeed").value;
            thePredators.forEach(predator => {
                predator.x += predator.vx * predatorSpeed;
                predator.y += predator.vy * predatorSpeed;
            } );
            // make sure that we stay on the screen
            thePredators.forEach(function(predator) {
                if ( (predator.x >= canvas.width) && (predator.vx >= 0) ) {
                    predator.vx = -predator.vx;
                    predator.collide();
                }
                else if ( (predator.x <= 0) && (predator.vx <= 0) ) {
                    predator.vx = -predator.vx;
                    predator.collide();
                }
                if ( (predator.y >= canvas.height) && (predator.vy >= 0) ) {
                    predator.vy = -predator.vy;
                    predator.collide();
                }
                else if ( (predator.y <= 0) && (predator.vy <= 0) ) {
                    predator.vy = -predator.vy;
                    predator.collide();
                }
            } );
        }
        // Handle teleporters, if needed
        if (specialMode.includes("specialTeleporter") ) {
            // change directions
            theTeleporters.forEach(teleporter => teleporter.steer(theBoids, thePredators, theTeleporters, specialMode, teleportCounter, canvas) );
            // move forward
            let teleporterSpeed = document.getElementById("teleporterSpeed").value;
            theTeleporters.forEach(teleporter => {
                teleporter.x += teleporter.vx * teleporterSpeed;
                teleporter.y += teleporter.vy * teleporterSpeed;
            });
            // make sure that we stay on the screen
            theTeleporters.forEach(teleporter => {
                if ( (teleporter.x >= canvas.width) && (teleporter.vx >= 0) ) {
                    teleporter.vx = -teleporter.vx;
                    teleporter.mx = -teleporter.mx;
                    teleporter.collide();
                }
                else if ( (teleporter.x <= 0) && (teleporter.vx <= 0) ) {
                    teleporter.vx = -teleporter.vx;
                    teleporter.mx = -teleporter.mx;
                    teleporter.collide();
                }
                if ( (teleporter.y >= canvas.height) && (teleporter.vy >= 0) ) {
                    teleporter.vy = -teleporter.vy;
                    teleporter.mx = -teleporter.mx;
                    teleporter.collide();
                }
                else if ( (teleporter.y <= 0) && (teleporter.vy <= 0) ) {
                    teleporter.vy = -teleporter.vy;
                    teleporter.mx = -teleporter.mx;
                    teleporter.collide();
                }
            });
        }

        // Now we can draw
        draw();
        // And loop
        window.requestAnimationFrame(loop);
        
        //update collision counter
        document.getElementById("boidCollisions").value = collisionCounter.getCount();
        //update reproduction counter, if visible on page
        if (collisionMode.includes("collisionReproduce") ) {
            document.getElementById("boidReproductions").value = reproductionCounter.getCount();
        }
        //update boid counter
        document.getElementById("boidPopulation").value = theBoids.length;
        //update prey counter, if visible on page
        if (specialMode.includes("specialPredator") ) {
            document.getElementById("boidsPreyedUpon").value = preyCounter.getCount();
        }
        //update teleportation counter, if visible on page
        if (specialMode.includes("specialTeleporter") ) {
            document.getElementById("teleportations").value = teleportCounter.getCount();
        }
        //handle fps counter
        currTime = performance.now();
        fpsCounter.recordTime(currTime-prevTime);
        if (fpsCounter.frameTimes.length >= 5) {
            document.getElementById("fps").innerHTML = fpsCounter.report().toFixed() + " fps";
            fpsCounter.clearTimes();
        }
        prevTime = currTime;
    }

    //Begin execution
    prevTime = performance.now();
    loop();
};
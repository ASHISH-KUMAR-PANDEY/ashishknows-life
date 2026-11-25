import { makeCard } from 'papercraft/lib/paperkit-3d.js';

export function makeDoll(H, { profile = false, withHat = false } = {}) {
  const { THREE, P2 } = H;
  const D = P2.draw2;
  const root = new THREE.Group();
  const hips = new THREE.Group();
  const trunk = new THREE.Group();
  root.add(hips, trunk);

  const skin = '#bf8259';
  const warm = '#e0aa7b';
  const hair = '#302723';
  const shirt = '#d86d3d';
  const shorts = '#273e36';
  const white = '#f1d8a7';

  const rect = (x, y, w, h, r = 0) => (g) => D.rect(g, x, y, w, h, r);
  const ell = (x, y, rx, ry, a = 0) => (g) => D.ell(g, x, y, rx, ry, a);
  const card = (name, points, paint, parent, x, y, z, back, edgeColor = 'auto') => {
    const node = makeCard(points, {
      ...H.cardOpts(0, 0, 1, root, 1.35),
      paint, back, edgeColor, thickness: .065, contact: null, folds: [], tone: .02,
    });
    node.name = name;
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  };
  const torso = [[-.57, -.18], [.56, -.18], [.71, .79], [.65, 1.14], [.28, 1.28], [-.27, 1.28], [-.65, 1.12], [-.72, .82]];
  card('jersey', torso, (P) => {
    P.gradient('#a04732', shirt, .35);
    P.layer([[-.5, .12], [.51, .12], [.60, .68], [-.53, .53]], '#bd5737', { depth: .38 });
    P.layer([[-.61, .98], [-.12, 1.11], [.59, .99], [.57, .77], [-.58, .77]], '#e7864e', { depth: .62 });
    P.layer(rect(-.19, 1.08, .38, .16, .035), '#413626', { depth: .42 });
    P.layer(rect(-.41, .57, .82, .045), '#efb46a', { depth: .3 });
    P.layer(rect(-.22, .31, .44, .18, .03), '#e5a560', { depth: .48 });
    P.layer(ell(.36, .95, .07, .065), white, { depth: .25 });
  }, trunk, 0, 0, .15, (P) => {
    P.gradient('#a04732', shirt);
    P.layer(rect(-.49, .62, .98, .36, .06), '#ec8750', { depth: .45 });
    P.layer(rect(-.18, .69, .36, .17), white, { depth: .24 });
  });
  const sideBody = card('folded jersey profile', [[-.22, 0], [.18, 0], [.18, .97], [-.12, 1.03], [-.27, .85]], (P) => {
    P.fill('#9d472e');
    P.layer(rect(-.22, .24, .27, .74, .04), '#c2623b', { depth: .31 });
  }, trunk, .05, .04, -.29);
  sideBody.rotation.y = Math.PI * .5;

  card('crew neck', [[-.24, 0], [.22, 0], [.23, .38], [-.24, .38]], (P) => {
    P.gradient(skin, warm);
    P.layer(rect(-.19, .04, .35, .14, .035), skin, { depth: .26 });
  }, trunk, 0, 1.15, -.06);
  const head = new THREE.Group();
  head.position.set(0, 1.52, .15);
  trunk.add(head);
  const face = [[-.2, -.13], [.20, -.13], [.4, .06], [.52, .45], [.48, .73], [.28, .92], [-.27, .92], [-.48, .73], [-.53, .43], [-.41, .07]];
  card('face', face, (P) => {
    P.gradient(skin, warm, -.5);
    P.layer(ell(-.42, .35, .125, .15), '#c18459', { depth: .38 });
    P.layer(ell(.42, .35, .11, .14), '#bd7c56', { depth: .38 });
    P.layer([[-.27, .09], [-.19, -.06], [.2, -.055], [.33, .14], [.3, .25], [.16, .18], [-.11, .17], [-.22, .24]], '#644035', { depth: .31 });
    P.layer(rect(-.28, .48, .16, .046, .02), hair, { depth: .32 });
    P.layer(rect(.12, .48, .16, .046, .02), hair, { depth: .32 });
    P.layer(ell(-.192, .393, .044, .053), hair, { depth: .23 });
    P.layer(ell(.188, .393, .044, .053), hair, { depth: .23 });
    P.layer([[-.075, .24], [.084, .23], [.032, .425]], '#ebb689', { depth: .5 });
    P.layer(ell(.01, .12, .115, .019), '#d59a78', { depth: .31 });
  }, head, 0, 0, .045, (P) => {
    P.fill(hair);
    P.layer(ell(0, .62, .42, .23), '#49332b', { depth: .48 });
  });
  card('swept hair', [[-.53, .58], [-.47, .90], [-.20, .94], [.26, .93], [.48, .86], [.53, .59], [.38, .67], [.20, .83], [-.18, .73], [-.39, .57]], (P) => {
    P.gradient('#211f1b', '#44312b', .45);
    P.layer([[-.38, .83], [-.11, .98], [.25, .95], [.29, .87], [-.03, .90]], '#564034', { depth: .38 });
    P.layer([[-.43, .70], [-.26, .79], [-.05, .82], [-.18, .75]], '#674638', { depth: .28 });
  }, head, 0, 0, .18);

  const hat = withHat ? new THREE.Group() : null;
  if (hat) {
    hat.name = 'straw hat';
    head.add(hat);
    const hatDisc = (name, radiusX, radiusZ, y, paint, edgeColor = '#b18145') => {
      const outline = Array.from({ length: 28 }, (_, i) => {
        const angle = i * Math.PI / 14;
        const edge = 1 + .014 * Math.sin(angle * 3 + .75);
        return [Math.cos(angle) * radiusX * edge, Math.sin(angle) * radiusZ * edge];
      });
      const layer = card(name, outline, paint, hat, 0, y, 0, 'mirror', edgeColor);
      layer.rotation.x = -Math.PI / 2;
    };
    hatDisc('straw brim', 1.04, .89, 0, (P) => {
      P.gradient('#ae763c', '#d9a84e', -.35);
      P.layer(ell(0, 0, .944, .799), '#d7a757', { depth: .47, rim: .48 });
      P.layer(ell(0, .015, .819, .691), '#dfb464', { depth: .34, rim: .32 });
      for (let i = 0; i < 18; i++) {
        const angle = i * Math.PI / 9;
        P.layer(ell(Math.cos(angle) * .904, Math.sin(angle) * .761, .046, .017, angle + 1.57), '#efd08a', { depth: .25 });
      }
    });
    const straw = (P) => {
      const { w, h } = P.box;
      P.gradient('#b58241', '#dfb468', -.26);
      P.layer(ell(0, 0, w * .42, h * .42), '#d6a95e', { depth: .40, rim: .30 });
    };
    hatDisc('crown base', .58, .45, .067, straw);
    hatDisc('russet hatband', .56, .435, .134, (P) => {
      P.fill('#a25338');
      P.layer(ell(0, 0, .486, .374), '#bf754c', { depth: .38, rim: .34 });
    }, '#9f4f34');
    hatDisc('lower hat crown', .52, .404, .201, straw);
    hatDisc('folded hat crown', .499, .38, .268, straw);
    hatDisc('straw crown top', .47, .35, .335, (P) => {
      straw(P);
      P.layer(ell(-.043, .025, .289, .199, .08), '#e0b76f', { depth: .36, rim: .32 });
      P.layer(ell(-.059, .050, .163, .055, .16), '#e9c887', { depth: .26 });
    });
    wearHat(1);
  }

  if (profile) {
    const profileCard = card('folded side of head', [[-.19,.24],[.087,.20],[.19,.34],[.19,.61],[.10,.77],[-.11,.78],[-.21,.64],[-.22,.40]], (P) => {
      P.gradient(skin, warm, -.4);
      P.layer([[-.19,.71],[.08,.78],[.16,.62],[.064,.49],[-.08,.39],[-.20,.45]], hair, {depth:.45});
      P.layer(ell(.01,.43,.068,.09),'#a46d4e',{depth:.35});
      P.layer(rect(.09,.48,.061,.033,.013),hair,{depth:.29});
    }, head, 0, 0, -.26, 'mirror');
    profileCard.rotation.y = -Math.PI * .5;
  }

  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    const shin = new THREE.Group();
    const foot = new THREE.Group();
    leg.position.set(side * .345, 0, -.16);
    shin.position.set(0, -.92, -.01);
    foot.position.set(0, -.78, .08);
    hips.add(leg);
    leg.add(shin);
    shin.add(foot);
    card('shorts ' + side, [[-.26, -1.025], [.25, -1.025], [.27, .12], [-.25, .12]], (P) => {
      P.gradient('#1e302a', shorts);
      P.layer(rect(-.18, -.92, .34, .94, .05), '#405b46', { depth: .42 });
      P.layer(rect(side * .19 - .025, -.91, .05, .86), '#bea05c', { depth: .25 });
    }, leg, 0, 0, .05);
    card('calf ' + side, [[-.17, -.82], [.18, -.82], [.21, -.11], [.17, .025], [-.17, .025], [-.21, -.1]], (P) => {
      P.gradient(skin, warm);
      P.layer(rect(-.15, -.77, .30, .31, .045), '#f1d3a5', { depth: .42 });
      P.layer(rect(-.145, -.55, .29, .05), '#d27a48', { depth: .28 });
    }, shin, 0, 0, -.04);
    card('running shoe ' + side, [[-.25, -.14], [.26, -.14], [.25, .05], [.15, .16], [-.16, .16], [-.25, .025]], (P) => {
      P.fill('#3b4b3b');
      P.layer(rect(-.23, -.115, .46, .09, .02), white, { depth: .38 });
      P.layer(rect(-.12, .01, .24, .11, .035), '#8d9d66', { depth: .28 });
      P.layer(rect(-.075, .07, .15, .026), white, { depth: .23 });
    }, foot, 0, 0, .11);

    const arm = new THREE.Group();
    const fore = new THREE.Group();
    arm.position.set(side * 1.01, .99, -.025);
    fore.position.set(0, -.67, .155);
    trunk.add(arm);
    arm.add(fore);
    card('sleeve and arm ' + side, [[-.19, -.73], [.17, -.73], [.20, .08], [.11, .19], [-.12, .19], [-.20, .07]], (P) => {
      P.gradient(skin, warm);
      P.layer(rect(-.19, -.35, .39, .53, .06), shirt, { depth: .45 });
      P.layer(rect(-.18, -.30, .36, .075), '#e39755', { depth: .3 });
    }, arm, 0, 0, .05);
    card('forearm and hand ' + side, [[-.15, -.57], [-.09, -.68], [.11, -.68], [.16, -.54], [.145, .045], [-.14, .045]], (P) => {
      P.gradient(skin, warm);
      P.layer(ell(0, -.53, .12, .14), '#d99968', { depth: .4 });
      P.layer(rect(-.13, -.41, .26, .07, .018), '#443c30', { depth: .25 });
    }, fore, 0, 0, .025);
    limbs.push({ side, leg, shin, foot, arm, fore });
  }

  const towardArm = (from, to, amount) => from + (to - from) * amount;

  function pose(action, angle, amount = 1) {
    const t = angle;
    const moving = action === 'run' || action === 'walk';
    const squat = action === 'lift' ? (.5 - .5 * Math.cos(t)) * amount : 0;
    const sideLean = action === 'cook' ? .055 * Math.sin(t) : 0;
    const seated = action === 'rest' || action === 'wave';
    const squatLeg = () => {
      const upper = .92;
      const lower = .78;
      const y = 1.69 - .55 * squat;
      const z = .03 + .16 * squat;
      const span = Math.min(upper + lower - .001, Math.hypot(y, z));
      const thigh = -Math.atan2(z, y) - Math.acos((upper * upper + span * span - lower * lower) / (2 * upper * span));
      const knee = Math.PI - Math.acos((upper * upper + lower * lower - span * span) / (2 * upper * lower));
      return [thigh, knee];
    };
    const [thigh, knee] = action === 'lift' ? squatLeg() : [0, 0];
    hips.position.set(0, 1.89 - .55 * squat - (seated ? .52 : 0), -.16 * squat);
    trunk.position.copy(hips.position);
    trunk.position.y -= moving ? .06 * (.5 - .5 * Math.cos(t * 2)) : 0;
    trunk.rotation.set(.21 * squat + (moving ? .13 : 0), sideLean, moving ? .035 * Math.sin(t) : 0);
    head.rotation.set(-.15 * squat, action === 'cook' ? -.14 : .06 * Math.sin(t), 0);

    for (const { side, leg, shin, foot, arm, fore } of limbs) {
      const wave = Math.sin(t + (side === -1 ? 0 : Math.PI));
      arm.position.set(side * (action === 'idle' || action === 'stand-wave' ? .94 : 1.01), .99, -.025);
      const gait = action === 'run' ? .69 : .40;
      leg.rotation.set(moving ? gait * wave : thigh - (seated ? .93 : 0), 0, side * (moving ? .025 : .045));
      shin.rotation.set(moving ? .12 + Math.max(0, -wave) * (action === 'run' ? .93 : .56) : knee + (seated ? 1.31 : 0), 0, 0);
      foot.rotation.x = moving ? -.26 + .23 * wave : -(thigh + knee + (seated ? .38 : 0));
      arm.rotation.set(
        action === 'lift' ? -.15 - .14 * squat :
          moving ? -gait * .82 * wave - .18 :
            action === 'cook' ? -.76 + .18 * Math.sin(t + side * 1.2) : seated ? -.45 : -.08,
        0, side * (action === 'lift' ? 1.03 : action === 'cook' ? .17 : .105),
      );
      fore.rotation.set(action === 'lift' ? -.30 : moving ? -1.04 : action === 'cook' ? -1.18 + .21 * Math.cos(t + side) : seated ? -1.38 : -.23, 0, action === 'lift' ? side * .79 : 0);
      if ((action === 'wave' || action === 'stand-wave') && side === 1) {
        arm.rotation.set(towardArm(seated ? -.45 : -.08, -.15, amount), .10 * amount, .105 + 1.49 * amount);
        fore.rotation.set(towardArm(seated ? -1.38 : -.23, -.21, amount), .12 * amount, (.98 + .42 * Math.sin(t)) * amount);
      }
    }
    return squat;
  }

  pose('idle', 0);
  function hand(side, point) {
    return limbs[side].fore.localToWorld(point.set(0, -.55, .05));
  }

  const down = new THREE.Vector3(0, -1, 0);
  const shoulder = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const wrist = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  function reach(index, destination) {
    const { side, arm, fore } = limbs[index];
    trunk.updateWorldMatrix(true, false);
    wrist.copy(destination);
    trunk.worldToLocal(wrist);
    shoulder.copy(arm.position);
    direction.subVectors(wrist, shoulder);
    const upper = fore.position.length();
    const lower = .55;
    const length = Math.min(upper + lower - .01, Math.max(.25, direction.length()));
    direction.normalize();
    const jointDistance = (upper * upper - lower * lower + length * length) / (2 * length);
    bend.set(.45 * side, -.90, -.24);
    bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    elbow.copy(direction).multiplyScalar(jointDistance)
      .addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - jointDistance * jointDistance)));
    arm.quaternion.setFromUnitVectors(direction.copy(fore.position).normalize(), bend.copy(elbow).normalize());
    wrist.sub(shoulder).sub(elbow).applyQuaternion(rotation.copy(arm.quaternion).invert()).normalize();
    fore.quaternion.setFromUnitVectors(down, wrist);
  }

  function mouth(point) {
    return head.localToWorld(point.set(.02, .18, .10));
  }

  const hatHand = new THREE.Vector3();
  const hatBrim = new THREE.Vector3();

  function wearHat(amount, grip = 0) {
    const away = 1 - amount;
    hat.visible = amount > 0;
    hat.position.set(-.01 + .93 * away, .98 + .28 * Math.sin(Math.PI * away) - .66 * away ** 3, .19 - .48 * away);
    hat.rotation.set(.22 + .78 * away, 0, -.024 - .75 * away);
    hat.scale.setScalar(1 - .89 * away ** 2);
    if (grip <= 0) return;

    limbs[1].arm.position.y += .14 * grip;
    hat.localToWorld(hatBrim.set(.75 - 1.15 * away, -.08, .56));
    reach(1, hand(1, hatHand).lerp(hatBrim, grip));
  }

  function crown(point) {
    return hat?.visible
      ? hat.localToWorld(point.set(0, .38, .08))
      : head.localToWorld(point.set(0, 1.02, .10));
  }

  function upperBack(point) {
    return trunk.localToWorld(point.set(0, .96, -.34));
  }

  const joints = [hips, trunk, head, ...limbs.flatMap(({ leg, shin, foot, arm, fore }) => [leg, shin, foot, arm, fore])];
  const priorPose = joints.map(() => ({ position: new THREE.Vector3(), rotation: new THREE.Quaternion() }));

  function settle(next, amount, angle = 0, actionAmount = 1) {
    if (amount <= 0) return;
    for (const [index, joint] of joints.entries()) {
      priorPose[index].position.copy(joint.position);
      priorPose[index].rotation.copy(joint.quaternion);
    }
    pose(next, angle, actionAmount);
    for (const [index, joint] of joints.entries()) {
      joint.position.lerp(priorPose[index].position, 1 - amount);
      joint.quaternion.slerp(priorPose[index].rotation, 1 - amount);
    }
  }

  return { root, pose, settle, hand, reach, mouth, crown, upperBack, wearHat };
}

<!--  compressed with java -jar {$path}/yuicompressor-2.3.5.jar -o {$file}-min.js {$file}.js -->
<script type="text/javascript"
	src="<?php echo AT_SHINDIG_URL; ?>/gadgets/js/rpc.js?c=1"></script>
<script type="text/javascript" src="<?php echo AT_SOCIAL_BASENAME; ?>lib/js/jquery-1.3.2.js"></script>
<!-- <script type="text/javascript" src="<?php echo AT_SOCIAL_BASENAME; ?>lib/js/jquery-ui.js"></script> -->
<script type="text/javascript"
	src="http://www.prototypejs.org/assets/2008/9/29/prototype-1.6.0.3.js"></script>
	<script type="text/javascript" src="<?php echo AT_SOCIAL_BASENAME; ?>lib/js/container.js"></script>

<h3><?php echo $this->app->getTitle(); ?></h3>
<div class="gadgets-gadget-content"><iframe width="800px"
	scrolling="<?php echo ($this->gadget['scrolling'] || $this->gadget['scrolling'] == 'true') ? 'yes' : 'no'?>"
	height="<?php $app=$this->app; echo $app->getHeight();?>px"
	frameborder="no" src="<?php echo $this->iframe_url;?>" class="gadgets-gadget"
	name="remote_iframe_<?php echo $this->app->getId();?>"
	id="remote_iframe_<?php echo $this->app->getId();?>"></iframe>
</div>
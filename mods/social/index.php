<?php
/****************************************************************/
/* ATutor														*/
/****************************************************************/
/* Copyright (c) 2002-2009										*/
/* Adaptive Technology Resource Centre / University of Toronto  */
/* http://atutor.ca												*/
/*                                                              */
/* This program is free software. You can redistribute it and/or*/
/* modify it under the terms of the GNU General Public License  */
/* as published by the Free Software Foundation.		*/
/****************************************************************/
// $Id$
$_user_location	= 'public';

define('AT_INCLUDE_PATH', '../../include/');
require (AT_INCLUDE_PATH.'vitals.inc.php');
require(AT_SOCIAL_INCLUDE.'friends.inc.php');
require(AT_SOCIAL_INCLUDE.'classes/Applications.class.php');
require(AT_SOCIAL_INCLUDE.'classes/SocialGroups/SocialGroup.class.php');
require(AT_SOCIAL_INCLUDE.'classes/SocialGroups/SocialGroups.class.php');
$_custom_css = $_base_path . 'mods/social/module.css'; // use a custom stylesheet

//Handles search queries from side menu
if (isset($_GET['searchFriends']) && $_GET['friendsName']!=''){
	$wanted = $addslashes($_GET['friendsName']);
	$friends = searchFriends($wanted, true);
}

//Handles remove request
if (isset($_GET['remove'])){
	$id = intval($_GET['id']);
//	if (isset($_GET['confirm_remove'])){
		removeFriend($id);
		header('Location: '.url_rewrite('mods/social/index.php', AT_PRETTY_URL_IS_HEADER));
		exit;
//	}
//	$msg->addConfirm("are_you_sure?");
//	header('Location: '.url_rewrite('mods/social/index.php?remove=yes'.SEP.'id='.$id.SEP.'confirm_remove=yes'));
}

//Handles request approval, and rejection
if (isset($_GET['approval'])){
	$id = intval($_GET['id']);
	if ($_GET['approval'] == 'y'){
		approveFriendRequest($id);
		$sql_notify = "SELECT first_name, last_name, email FROM ".TABLE_PREFIX."members WHERE member_id=$id";
		$result_notify = mysql_query($sql_notify, $db);
		$row_notify = mysql_fetch_assoc($result_notify);

		if ($row_notify['email'] != '') {
			require(AT_INCLUDE_PATH . 'classes/phpmailer/atutormailer.class.php');
			$body = _AT('notification_accept_contact', get_display_name($_SESSION['member_id']), $_base_href.'mods/social/index_mystart.php');
			$sender = get_display_name($_SESSION['member_id']);
			$mail = new ATutorMailer;
			$mail->AddAddress($row_notify['email'], $sender);
			$mail->FromName = $_config['site_name'];
			$mail->From     = $_config['contact_email'];
			$mail->Subject  = _AT('contact_accepted');
			$mail->Body     = $body;

			if(!$mail->Send()) {
				$msg->addError('SENDING_ERROR');
			}
			unset($mail);
		}

	} elseif ($_GET['approval'] == 'n'){
		rejectFriendRequest($id);
	}
	header('Location: '.url_rewrite('mods/social/index.php', AT_PRETTY_URL_IS_HEADER));
	exit;
}

include (AT_INCLUDE_PATH.'header.inc.php'); 
$savant->display('pubmenu.tmpl.php'); ?>
	<div style="float:left; width:59%;">
		<?php
			//network updates
			$actvity_obj = new Activity();
			$savant->assign('activities', $actvity_obj->getFriendsActivities($_SESSION['member_id']));
			$savant->display('activities.tmpl.php');

			//applications/gagdets
			$applications_obj = new Applications();
			$savant->assign('list_of_my_apps', $applications_obj->listMyApplications(true));
			$savant->display('tiny_applications.tmpl.php');
//			echo '<div class="gadget_wrapper">';
//			echo '<div class="gadget_title_bar">Applications</div>';
//			echo '<div class="gadget_container">TODO: GADGETS/Applications</div>';
//			echo '</div>';
		?>
	</div>

	<!-- counts -->
	<div style="float:right;width:39%;min-width:39%;">
		<div class="headingbox">
			<h3><?php echo _AT('visitor_counts'); ?>: 
			<?php 
				$user = new Member($_SESSION['member_id']); 
				echo $user->getVisitors();
			?>
			</h3>
		</div>
		<div class="contentbox"></div>
	</div>
	<div style="float:right;width:39%;min-width:39%;">
		<?php			
			//if friends array is not empty.
			if (!empty($friends)){
				$savant->assign('friends', $friends);
			} else {
				$savant->assign('friends', getFriends($_SESSION['member_id'], SOCIAL_FRIEND_HOMEPAGE_MAX));
			}
			$savant->assign('group_invitations', getGroupInvitations());
			$savant->assign('group_requests', getGroupRequests());
			$savant->assign('pending_requests', getPendingRequests());
			$savant->display('friend_list.tmpl.php'); 
		?>
		
	</div>
	
	<!-- people you may know -->
	<?php 
	$people_you_may_know = getPeopleYouMayKnow();	
	if(!empty($people_you_may_know)):
	?>
	<div style="padding-top:1em;float:right;clear:right;width:39%;min-width:39%;">
		
		<div class="headingbox">
			<h3><?php echo _AT('people_you_may_know'); ?></h3>
		</div>
		<div class="contentbox">
		<?php foreach ($people_you_may_know as $index=>$id): ?>
			<div style="width:100%;">
				<div style="padding-bottom:0.2em;">
					<?php echo printSocialProfileImg($id); ?>					
					<?php echo printSocialName($id); ?>
					<a href="mods/social/connections.php?id=<?php echo $id; ?>"><img src="<?php echo $_base_href; ?>mods/social/images/plus_icon.gif" alt="<?php echo _AT('add_to_friends'); ?>" title="<?php echo _AT('add_to_friends'); ?>" border="0" style=""/></a>
				</div>
			</div>
		<?php endforeach; ?>
		</div>
	</div>
	<?php endif; ?>

	<div style="float:right;clear:right;width:39%;min-width:39%;"><br />
	<?php			
		//if my groups array is not empty.
		$social_group = new SocialGroups();
		$my_groups = $social_group->getMemberGroups($_SESSION['member_id']);
		$savant->assign('my_groups', $my_groups);
		$savant->display('tiny_sgroups.tmpl.php');
	?>
	</div>


<?php include (AT_INCLUDE_PATH.'footer.inc.php'); ?>
